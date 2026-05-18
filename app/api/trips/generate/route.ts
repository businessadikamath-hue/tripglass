import { NextResponse, type NextRequest } from "next/server";
import { apiError } from "@/lib/server/apiErrors";
import { generateTrip } from "@/lib/server/tripGeneration";
import { tripInputSchema } from "@/lib/validation/tripInput";

const recentGenerations = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const current = (recentGenerations.get(ip) ?? []).filter((time) => now - time < windowMs);
  if (current.length >= 6) return true;
  current.push(now);
  recentGenerations.set(ip, current);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (rateLimited(ip)) {
    return apiError("RATE_LIMITED", "Too many generation requests. Please wait a minute and try again.", 429);
  }

  const json = await request.json().catch(() => null);
  const parsed = tripInputSchema.safeParse(json);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Please check the trip details and try again.", 422, parsed.error.flatten());
  }

  try {
    const result = await generateTrip(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "OPENAI_KEY_MISSING") {
      return apiError("MISSING_API_KEY", "OpenAI is not configured and mock mode is disabled.", 500);
    }
    return apiError("UNKNOWN_ERROR", "We could not generate this trip. Please try again.", 500, error);
  }
}
