import { NextResponse } from "next/server";
import { isGooglePlacesConfigured } from "@/lib/server/googlePlaces";
import { isOpenAIConfigured } from "@/lib/server/openai";
import { isSupabaseServerConfigured } from "@/lib/supabase/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    integrations: {
      supabase: isSupabaseServerConfigured(),
      openai: isOpenAIConfigured(),
      googleMapsServer: isGooglePlacesConfigured(),
      googleMapsBrowser: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
      openMeteo: true,
      mockMode: process.env.ENABLE_MOCK_MODE !== "false",
    },
  });
}
