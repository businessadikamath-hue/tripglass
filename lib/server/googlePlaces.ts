import type { NormalizedPlace } from "@/types/places";

const PLACES_BASE = "https://places.googleapis.com/v1/places";

function googleKey() {
  return process.env.GOOGLE_MAPS_API_KEY;
}

export function isGooglePlacesConfigured() {
  return Boolean(googleKey());
}

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  websiteUri?: string;
  googleMapsUri?: string;
};

export function normalizeGooglePlace(place: GooglePlace): NormalizedPlace {
  return {
    place_id: place.id ?? "",
    name: place.displayName?.text ?? "Unnamed place",
    address: place.formattedAddress ?? null,
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    rating: place.rating ?? null,
    user_ratings_total: place.userRatingCount ?? null,
    price_level: place.priceLevel ?? null,
    types: place.types ?? [],
    website_url: place.websiteUri ?? null,
    google_maps_url: place.googleMapsUri ?? null,
  };
}

export async function searchPlacesByText(query: string, locationBias?: { lat: number; lng: number }) {
  const key = googleKey();
  if (!key) return [];

  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount: 8,
    languageCode: "en",
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: { latitude: locationBias.lat, longitude: locationBias.lng },
        radius: 35000,
      },
    };
  }

  const response = await fetch(`${PLACES_BASE}:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types,places.websiteUri,places.googleMapsUri",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Places search failed with ${response.status}`);
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  return (data.places ?? []).map(normalizeGooglePlace).filter((place) => place.place_id);
}

export async function autocompleteDestination(input: string) {
  if (!googleKey() || input.trim().length < 2) return [];
  return searchPlacesByText(`${input} destination`);
}

export async function getPlaceDetails(placeId: string) {
  const key = googleKey();
  if (!key) return null;

  const response = await fetch(`${PLACES_BASE}/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,types,websiteUri,googleMapsUri",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google Places details failed with ${response.status}`);
  }

  return normalizeGooglePlace((await response.json()) as GooglePlace);
}

export async function getCandidatePlaces(input: {
  destination: string;
  lat?: number | null;
  lng?: number | null;
  interests: string[];
  foodPreferences: string[];
}) {
  if (!isGooglePlacesConfigured()) return [];
  const lowerInterests = input.interests.map((item) => item.toLowerCase());
  const queries = [
    `top attractions in ${input.destination}`,
    `best neighborhoods to explore in ${input.destination}`,
    `best affordable restaurants in ${input.destination}`,
    lowerInterests.includes("museums") ? `best museums in ${input.destination}` : null,
    lowerInterests.includes("nature") ? `parks and nature in ${input.destination}` : null,
    lowerInterests.includes("cafes") ? `best cafes in ${input.destination}` : null,
    lowerInterests.includes("history") ? `historic sites in ${input.destination}` : null,
    input.foodPreferences.length
      ? `${input.foodPreferences.join(" ")} restaurants in ${input.destination}`
      : null,
    `free things to do in ${input.destination}`,
  ].filter(Boolean) as string[];

  const seen = new Map<string, NormalizedPlace>();
  for (const query of queries) {
    const results = await searchPlacesByText(
      query,
      input.lat && input.lng ? { lat: input.lat, lng: input.lng } : undefined,
    );
    for (const place of results) {
      if (!seen.has(place.place_id) && seen.size < 60) seen.set(place.place_id, place);
    }
  }

  return Array.from(seen.values());
}
