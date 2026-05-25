import { NextResponse } from "next/server";
import { isDuffelConfigured } from "@/lib/server/duffel";
import { isGeminiConfigured } from "@/lib/server/gemini";
import { isGooglePlacesConfigured } from "@/lib/server/googlePlaces";
import { isOpenAIConfigured } from "@/lib/server/openai";
import { getAIProvider } from "@/lib/server/tripGeneration";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    integrations: {
      supabase: isSupabaseServerConfigured(),
      aiProvider: getAIProvider(),
      openai: isOpenAIConfigured(),
      gemini: isGeminiConfigured(),
      googleMapsServer: isGooglePlacesConfigured(),
      googleMapsBrowser: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      duffel: isDuffelConfigured(),
      openMeteo: true,
    },
  });
}
