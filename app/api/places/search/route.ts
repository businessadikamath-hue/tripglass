import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { searchPlacesByText, isGooglePlacesConfigured } from "@/lib/server/googlePlaces";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return apiError("VALIDATION_ERROR", "Enter a search query.", 422);

  if (!isGooglePlacesConfigured()) {
    return NextResponse.json({
      places: [],
      warning: "Live place search is unavailable. You can still enter a destination manually.",
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
    return apiError("GOOGLE_PLACES_ERROR", "Live place search is unavailable. You can still enter a destination manually.", 502, error);
  }
}
