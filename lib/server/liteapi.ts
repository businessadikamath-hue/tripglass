import { addDays, formatISO, isAfter, parseISO } from "date-fns";
import type { DuffelHotelOffer } from "@/types/duffel";
import type { TripInput } from "@/types/trip";

type LiteApiError = {
  error?: { message?: string; description?: string };
  errors?: Array<{ message?: string; detail?: string; title?: string }>;
};

type RawLiteHotel = {
  id?: string;
  hotelId?: string;
  name?: string;
  hotelName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
};

type RawLiteRate = {
  id?: string;
  rateId?: string;
  offerId?: string;
  hotelId?: string;
  hotel?: RawLiteHotel;
  hotelData?: RawLiteHotel;
  hotelName?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  price?: unknown;
  total?: unknown;
  amount?: unknown;
  totalAmount?: unknown;
  retailRate?: { total?: unknown; amount?: unknown; currency?: string };
  netRate?: { total?: unknown; amount?: unknown; currency?: string };
  currency?: string;
  roomType?: string;
  roomName?: string;
  cancellationPolicies?: Array<{ description?: string; text?: string }>;
};

function isLiteApiConfigured() {
  return Boolean(process.env.LITEAPI_KEY?.trim());
}

export function isLiteApiHotelEnabled() {
  return isLiteApiConfigured() && process.env.ENABLE_LITEAPI_HOTELS !== "false";
}

function liteApiTimeoutMs() {
  const parsed = Number(process.env.LITEAPI_TIMEOUT_MS);
  return Number.isFinite(parsed) ? Math.max(2000, Math.min(25000, parsed)) : 12000;
}

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function nextDate(value: string) {
  return formatISO(addDays(parseISO(toDateOnly(value)), 1), {
    representation: "date",
  });
}

function checkoutDate(input: TripInput) {
  const start = input.start_date ? toDateOnly(input.start_date) : null;
  const end = input.end_date ? toDateOnly(input.end_date) : null;
  if (!start) return null;
  if (!end) return nextDate(start);
  return isAfter(parseISO(end), parseISO(start)) ? end : nextDate(start);
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function liteApiFetch<T>(path: string, init: RequestInit) {
  const key = process.env.LITEAPI_KEY?.trim();
  if (!key) throw new Error("LITEAPI_KEY_MISSING");

  const response = await fetch(`https://api.liteapi.travel/v3.0${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-API-Key": key,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(liteApiTimeoutMs()),
  });

  if (response.status === 204) return null as T;

  const text = await response.text();
  const payload = parseLiteApiPayload(text) as T & LiteApiError;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.description ||
      payload?.errors?.[0]?.message ||
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      `LiteAPI request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function parseLiteApiPayload(text: string) {
  if (!text.trim()) return null;
  if (!text.trimStart().startsWith("data:")) return JSON.parse(text);

  const chunks = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s*/, ""))
    .filter((line) => line && line !== "[DONE]")
    .map((line) => JSON.parse(line));

  return chunks.length === 1 ? chunks[0] : chunks;
}

function flattenRates(payload: unknown): RawLiteRate[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.flatMap(flattenRates);
  if (typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  for (const key of ["data", "hotels", "results", "rates"]) {
    if (Array.isArray(record[key])) return record[key].flatMap(flattenRates);
  }

  if (Array.isArray(record.rates)) {
    return record.rates.map((rate) => ({
      ...(rate as RawLiteRate),
      hotel: (record.hotel as RawLiteHotel) ?? (record.hotelData as RawLiteHotel),
      hotelId: String(record.hotelId ?? record.id ?? ""),
      hotelName: String(record.hotelName ?? record.name ?? ""),
      address: String(record.address ?? ""),
      latitude: toNumber(record.latitude ?? record.lat) ?? undefined,
      longitude: toNumber(record.longitude ?? record.lng) ?? undefined,
    }));
  }

  return [record as RawLiteRate];
}

function rateAmount(rate: RawLiteRate) {
  return (
    toNumber(rate.retailRate?.total) ??
    toNumber(rate.retailRate?.amount) ??
    toNumber(rate.totalAmount) ??
    toNumber(rate.total) ??
    toNumber(rate.price) ??
    toNumber(rate.amount) ??
    toNumber(rate.netRate?.total) ??
    toNumber(rate.netRate?.amount)
  );
}

function normalizeHotelOffer(
  rate: RawLiteRate,
  input: TripInput,
  checkedAt: string,
): DuffelHotelOffer | null {
  const hotel = rate.hotel ?? rate.hotelData ?? {};
  const totalAmount = rateAmount(rate);
  const hotelId = rate.hotelId ?? hotel.hotelId ?? hotel.id;
  const hotelName = rate.hotelName ?? rate.name ?? hotel.hotelName ?? hotel.name;
  if (!hotelId || !hotelName || totalAmount === null) return null;

  return {
    id: rate.rateId ?? rate.offerId ?? rate.id ?? String(hotelId),
    source: "liteapi",
    hotelId: String(hotelId),
    hotelName: String(hotelName),
    address: rate.address ?? hotel.address ?? null,
    lat: toNumber(rate.latitude ?? rate.lat ?? hotel.latitude ?? hotel.lat),
    lng: toNumber(rate.longitude ?? rate.lng ?? hotel.longitude ?? hotel.lng),
    checkInDate: input.start_date ? toDateOnly(input.start_date) : "",
    checkOutDate: checkoutDate(input) ?? "",
    totalAmount,
    currency: (
      rate.retailRate?.currency ??
      rate.netRate?.currency ??
      rate.currency ??
      input.currency
    )
      .slice(0, 3)
      .toUpperCase(),
    roomType: rate.roomType ?? rate.roomName ?? "Lowest available room rate",
    cancellationDescription:
      rate.cancellationPolicies?.[0]?.description ??
      rate.cancellationPolicies?.[0]?.text ??
      null,
    checkedAt,
  };
}

export async function getLiteApiHotelOffers(
  input: TripInput,
  destinationLat: number | null | undefined,
  destinationLng: number | null | undefined,
  warnings: string[],
): Promise<DuffelHotelOffer[]> {
  if (!input.include_travel_costs) return [];
  if (!isLiteApiHotelEnabled()) {
    warnings.push("LiteAPI hotels are not configured. AI hotel estimates were used.");
    return [];
  }

  const checkInDate = input.start_date ? toDateOnly(input.start_date) : null;
  const checkOutDate = checkoutDate(input);
  if (!checkInDate || !checkOutDate) {
    warnings.push("Add travel dates to fetch live hotel rates.");
    return [];
  }

  const radius = Math.min(
    20000,
    Math.max(2000, Math.ceil((input.travel_radius_minutes ?? 45) * 250)),
  );
  const body: Record<string, unknown> = {
    occupancies: [{ adults: Math.max(1, input.travelers) }],
    currency: input.currency,
    guestNationality: process.env.LITEAPI_GUEST_NATIONALITY || "US",
    checkin: checkInDate,
    checkout: checkOutDate,
    timeout: Math.max(4, Math.min(12, Math.floor(liteApiTimeoutMs() / 1000) - 1)),
    maxRatesPerHotel: 1,
    limit: 10,
    includeHotelData: true,
    sort: [{ field: "price", direction: "ascending" }],
  };

  if (typeof destinationLat === "number" && typeof destinationLng === "number") {
    body.latitude = destinationLat;
    body.longitude = destinationLng;
    body.radius = radius;
  } else {
    body.aiSearch = `Hotels in ${input.destination_text}`;
  }

  const checkedAt = new Date().toISOString();
  const payload = await liteApiFetch<unknown>("/hotels/rates", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const offers = flattenRates(payload)
    .map((rate) => normalizeHotelOffer(rate, input, checkedAt))
    .filter((offer): offer is DuffelHotelOffer => Boolean(offer))
    .sort((a, b) => a.totalAmount - b.totalAmount)
    .slice(0, 8);

  if (offers.length === 0) {
    warnings.push("LiteAPI returned no live hotel availability. AI hotel estimates were used.");
  }

  return offers;
}
