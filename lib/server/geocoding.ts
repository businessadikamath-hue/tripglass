import type { NormalizedPlace } from "@/types/places";

type OpenMeteoGeocodeResponse = {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

export async function searchDestinationsFallback(query: string): Promise<NormalizedPlace[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
  if (!response.ok) return [];

  const payload = (await response.json()) as OpenMeteoGeocodeResponse;

  return (payload.results ?? []).map((result) => ({
    place_id: `openmeteo-${result.id}`,
    name: [
      result.name,
      result.admin1 && result.admin1 !== result.name ? result.admin1 : null,
      result.country,
    ]
      .filter(Boolean)
      .join(", "),
    address: [result.admin1, result.country].filter(Boolean).join(", ") || null,
    lat: result.latitude,
    lng: result.longitude,
    rating: null,
    user_ratings_total: null,
    price_level: null,
    types: ["destination"],
    website_url: null,
    google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${result.latitude},${result.longitude}`,
    )}`,
  }));
}
