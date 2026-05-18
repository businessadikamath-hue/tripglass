import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { getDailyWeather } from "@/lib/server/weather";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !start || !end) {
    return apiError("VALIDATION_ERROR", "lat, lng, start, and end are required.", 422);
  }
  try {
    const weather = await getDailyWeather(lat, lng, start, end);
    return NextResponse.json({ weather });
  } catch (error) {
    return apiError("WEATHER_ERROR", "Weather is unavailable right now.", 502, error);
  }
}
