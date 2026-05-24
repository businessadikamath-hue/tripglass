import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "MISSING_API_KEY"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "OPENAI_ERROR"
  | "GOOGLE_PLACES_ERROR"
  | "AMADEUS_ERROR"
  | "WEATHER_ERROR"
  | "DATABASE_ERROR"
  | "RATE_LIMITED"
  | "UNKNOWN_ERROR";

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(process.env.NODE_ENV !== "production" && details ? { details } : {}),
      },
    },
    { status },
  );
}

export function missingEnv(name: string) {
  return !process.env[name] || process.env[name]?.trim() === "";
}
