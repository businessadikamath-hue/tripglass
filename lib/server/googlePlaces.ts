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

type LegacyGooglePlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  url?: string;
  website?: string;
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

function normalizeLegacyGooglePlace(place: LegacyGooglePlace): NormalizedPlace {
  return {
    place_id: place.place_id ?? "",
    name: place.name ?? "Unnamed place",
    address: place.formatted_address ?? null,
    lat: place.geometry?.location?.lat ?? null,
    lng: place.geometry?.location?.lng ?? null,
    rating: place.rating ?? null,
    user_ratings_total: place.user_ratings_total ?? null,
    price_level:
      place.price_level === undefined ? null : String(place.price_level),
    types: place.types ?? [],
    website_url: place.website ?? null,
    google_maps_url:
      place.url ??
      (place.geometry?.location?.lat !== undefined && place.geometry.location.lng !== undefined
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.geometry.location.lat},${place.geometry.location.lng}`,
          )}`
        : null),
  };
}

async function searchPlacesByLegacyText(
  query: string,
  locationBias?: { lat: number; lng: number; radiusMeters?: number },
) {
  const key = googleKey();
  if (!key) return [];

  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", key);
  if (locationBias) {
    url.searchParams.set("location", `${locationBias.lat},${locationBias.lng}`);
    url.searchParams.set("radius", String(locationBias.radiusMeters ?? 35000));
  }

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Places legacy search failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: LegacyGooglePlace[];
    status?: string;
    error_message?: string;
  };
  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(data.error_message || `Google Places legacy search failed: ${data.status}`);
  }

  return (data.results ?? [])
    .map(normalizeLegacyGooglePlace)
    .filter((place) => place.place_id);
}

export async function searchPlacesByText(
  query: string,
  locationBias?: { lat: number; lng: number; radiusMeters?: number },
) {
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
        radius: locationBias.radiusMeters ?? 35000,
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
    return searchPlacesByLegacyText(query, locationBias);
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  const places = (data.places ?? []).map(normalizeGooglePlace).filter((place) => place.place_id);
  return places.length ? places : searchPlacesByLegacyText(query, locationBias);
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
  travelRadiusMinutes?: number | null;
  rentalCar?: "no" | "maybe" | "yes" | null;
}) {
  if (!isGooglePlacesConfigured()) return [];
  const lowerInterests = input.interests.map((item) => item.toLowerCase());
  const radiusMeters = Math.min(
    50000,
    Math.max(8000, (input.travelRadiusMinutes ?? 45) * (input.rentalCar === "yes" ? 950 : 650)),
  );
  const queries = [
    `top attractions in ${input.destination}`,
    `specific well rated hotels in ${input.destination}`,
    `central boutique hotels in ${input.destination}`,
    `best neighborhoods to explore in ${input.destination}`,
    `specific best affordable restaurants in ${input.destination}`,
    `specific local restaurants in ${input.destination}`,
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
      input.lat && input.lng ? { lat: input.lat, lng: input.lng, radiusMeters } : undefined,
    );
    for (const place of results) {
      if (!seen.has(place.place_id) && seen.size < 60) seen.set(place.place_id, place);
    }
  }

  return Array.from(seen.values());
}
