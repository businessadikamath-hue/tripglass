import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { getPlaceDetails, isGooglePlacesConfigured } from "@/lib/server/googlePlaces";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId");
  if (!placeId) return apiError("VALIDATION_ERROR", "Missing placeId.", 422);
  if (!isGooglePlacesConfigured()) {
    return apiError("MISSING_API_KEY", "Google Places is not configured.", 503);
  }
  try {
    const place = await getPlaceDetails(placeId);
    return NextResponse.json({ place });
  } catch (error) {
    return apiError("GOOGLE_PLACES_ERROR", "Could not load place details.", 502, error);
  }
}
