import { NextResponse, type NextRequest } from "next/server";
import { getAmadeusTravelOffers } from "@/lib/server/amadeus";
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
    const offers = await getAmadeusTravelOffers(
      parsed.data,
      parsed.data.destination_lat,
      parsed.data.destination_lng,
    );
    return NextResponse.json({ offers });
  } catch (error) {
    return apiError(
      "AMADEUS_ERROR",
      "Could not load live flight and hotel offers.",
      502,
      error,
    );
  }
}
