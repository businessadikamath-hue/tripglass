import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { searchDestinationsFallback } from "@/lib/server/geocoding";
import { searchPlacesByText, isGooglePlacesConfigured } from "@/lib/server/googlePlaces";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return apiError("VALIDATION_ERROR", "Enter a search query.", 422);

  if (!isGooglePlacesConfigured()) {
    const places = await searchDestinationsFallback(query);
    return NextResponse.json({
      places,
      source: "open_meteo_geocoding",
    });
  }

  try {
    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lng = Number(request.nextUrl.searchParams.get("lng"));
    const places = await searchPlacesByText(
      query,
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined,
    );
    return NextResponse.json({ places });
  } catch (error) {
    const places = await searchDestinationsFallback(query);
    if (places.length > 0) {
      return NextResponse.json({
        places,
        source: "open_meteo_geocoding",
      });
    }

    return apiError(
      "GOOGLE_PLACES_ERROR",
      "Destination search is temporarily unavailable. You can still enter a destination manually.",
      502,
      error,
    );
  }
}
