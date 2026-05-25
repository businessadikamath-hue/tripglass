import { NextResponse, type NextRequest } from "next/server";
import { getDuffelTravelOffers } from "@/lib/server/duffel";
import { apiError } from "@/lib/server/apiErrors";
import { tripInputSchema } from "@/lib/validation/tripInput";

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = tripInputSchema.safeParse(json);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Please check the trip details and try again.",
      422,
      parsed.error.flatten(),
    );
  }

  try {
    const offers = await getDuffelTravelOffers(
      parsed.data,
      parsed.data.destination_lat,
      parsed.data.destination_lng,
    );
    return NextResponse.json({ offers });
  } catch (error) {
    return apiError(
      "DUFFEL_ERROR",
      "Could not load live flight and hotel offers. AI estimates can still be used.",
      502,
      error,
    );
  }
}
