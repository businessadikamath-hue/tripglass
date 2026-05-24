import { addDays, formatISO, isAfter, parseISO } from "date-fns";
import type {
  AmadeusFlightOffer,
  AmadeusFlightSegment,
  AmadeusHotelOffer,
  AmadeusTravelOffers,
} from "@/types/amadeus";
import type { TripInput } from "@/types/trip";

type TokenPayload = {
  access_token?: string;
  expires_in?: number;
  error_description?: string;
};

type AmadeusLocation = {
  iataCode?: string;
  address?: { cityCode?: string };
};

type RawFlightOffer = {
  id?: string;
  oneWay?: boolean;
  lastTicketingDate?: string;
  validatingAirlineCodes?: string[];
  price?: { total?: string; currency?: string };
  itineraries?: Array<{
    duration?: string;
    segments?: Array<{
      carrierCode?: string;
      number?: string;
      duration?: string;
      departure?: { iataCode?: string; at?: string };
      arrival?: { iataCode?: string; at?: string };
    }>;
  }>;
};

type RawHotelListItem = {
  hotelId?: string;
};

type RawHotelOffer = {
  hotel?: {
    hotelId?: string;
    name?: string;
    geoCode?: { latitude?: number; longitude?: number };
  };
  offers?: Array<{
    id?: string;
    checkInDate?: string;
    checkOutDate?: string;
    rateCode?: string;
    boardType?: string;
    room?: {
      typeEstimated?: {
        category?: string;
        beds?: number;
        bedType?: string;
      };
    };
    price?: { total?: string; currency?: string };
    policies?: {
      paymentType?: string;
      cancellations?: Array<{ description?: { text?: string } }>;
    };
  }>;
};

let cachedToken: { token: string; expiresAt: number } | null = null;

export function isAmadeusConfigured() {
  return Boolean(
    process.env.AMADEUS_CLIENT_ID?.trim() &&
      process.env.AMADEUS_CLIENT_SECRET?.trim(),
  );
}

export function isAmadeusTravelEnabled() {
  return isAmadeusConfigured();
}

function amadeusBaseUrl() {
  const env = process.env.AMADEUS_ENV?.trim().toLowerCase();
  return env === "production"
    ? "https://api.amadeus.com"
    : "https://test.api.amadeus.com";
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

async function getAmadeusToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID?.trim();
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("AMADEUS_KEY_MISSING");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(`${amadeusBaseUrl()}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as TokenPayload;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || `Amadeus auth failed with ${response.status}`,
    );
  }

  cachedToken = {
    token: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 1200) * 1000,
  };
  return cachedToken.token;
}

async function amadeusGet<T>(path: string, params: Record<string, string | number | boolean | null | undefined>) {
  const token = await getAmadeusToken();
  const url = new URL(`${amadeusBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T & {
    errors?: Array<{ detail?: string; title?: string }>;
  };

  if (!response.ok) {
    const message =
      payload.errors?.[0]?.detail ||
      payload.errors?.[0]?.title ||
      `Amadeus request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function resolveIataCode(keyword?: string | null) {
  if (!keyword?.trim() || !isAmadeusConfigured()) return null;

  const payload = await amadeusGet<{ data?: AmadeusLocation[] }>(
    "/v1/reference-data/locations",
    {
      subType: "CITY,AIRPORT",
      keyword: keyword.trim(),
      "page[limit]": 5,
    },
  );

  const first = payload.data?.find((item) => item.iataCode || item.address?.cityCode);
  return first?.iataCode ?? first?.address?.cityCode ?? null;
}

function normalizeFlightOffer(
  offer: RawFlightOffer,
  originIata: string,
  destinationIata: string,
  checkedAt: string,
): AmadeusFlightOffer | null {
  const totalAmount = toNumber(offer.price?.total);
  if (!offer.id || totalAmount === null) return null;

  return {
    id: offer.id,
    source: "amadeus",
    originIata,
    destinationIata,
    totalAmount,
    currency: (offer.price?.currency ?? "USD").slice(0, 3).toUpperCase(),
    validatingAirlineCodes: offer.validatingAirlineCodes ?? [],
    oneWay: Boolean(offer.oneWay),
    lastTicketingDate: offer.lastTicketingDate ?? null,
    checkedAt,
    itineraries:
      offer.itineraries?.map((itinerary) => ({
        duration: itinerary.duration ?? null,
        segments:
          itinerary.segments?.map(
            (segment): AmadeusFlightSegment => ({
              carrierCode: segment.carrierCode ?? "",
              flightNumber: segment.number ?? "",
              departureIata: segment.departure?.iataCode ?? "",
              arrivalIata: segment.arrival?.iataCode ?? "",
              departureAt: segment.departure?.at ?? "",
              arrivalAt: segment.arrival?.at ?? "",
              duration: segment.duration ?? null,
            }),
          ) ?? [],
      })) ?? [],
  };
}

async function getFlightOffers(input: TripInput, warnings: string[]) {
  if (!input.starting_city?.trim()) {
    warnings.push("Add a starting city to fetch live flight offers.");
    return { originIata: null, destinationIata: null, flightOffers: [] };
  }
  if (!input.start_date) {
    warnings.push("Add travel dates to fetch live flight offers.");
    return { originIata: null, destinationIata: null, flightOffers: [] };
  }

  const [originIata, destinationIata] = await Promise.all([
    resolveIataCode(input.starting_city),
    resolveIataCode(input.destination_text),
  ]);

  if (!originIata || !destinationIata) {
    warnings.push("Amadeus could not resolve flight IATA codes for this route.");
    return { originIata, destinationIata, flightOffers: [] };
  }

  const checkedAt = new Date().toISOString();
  const payload = await amadeusGet<{ data?: RawFlightOffer[] }>(
    "/v2/shopping/flight-offers",
    {
      originLocationCode: originIata,
      destinationLocationCode: destinationIata,
      departureDate: toDateOnly(input.start_date),
      returnDate: input.end_date ? toDateOnly(input.end_date) : undefined,
      adults: Math.max(1, input.travelers),
      currencyCode: input.currency,
      max: 5,
    },
  );

  return {
    originIata,
    destinationIata,
    flightOffers: (payload.data ?? [])
      .map((offer) => normalizeFlightOffer(offer, originIata, destinationIata, checkedAt))
      .filter((offer): offer is AmadeusFlightOffer => Boolean(offer))
      .sort((a, b) => a.totalAmount - b.totalAmount),
  };
}

function normalizeHotelOffer(raw: RawHotelOffer, checkedAt: string): AmadeusHotelOffer | null {
  const offer = raw.offers?.[0];
  const totalAmount = toNumber(offer?.price?.total);
  if (!raw.hotel?.hotelId || !raw.hotel.name || !offer?.id || totalAmount === null) {
    return null;
  }

  const roomBits = [
    offer.room?.typeEstimated?.category,
    offer.room?.typeEstimated?.beds
      ? `${offer.room.typeEstimated.beds} bed`
      : null,
    offer.room?.typeEstimated?.bedType,
  ].filter(Boolean);

  return {
    id: offer.id,
    source: "amadeus",
    hotelId: raw.hotel.hotelId,
    hotelName: raw.hotel.name,
    lat: toNumber(raw.hotel.geoCode?.latitude),
    lng: toNumber(raw.hotel.geoCode?.longitude),
    checkInDate: offer.checkInDate ?? "",
    checkOutDate: offer.checkOutDate ?? "",
    totalAmount,
    currency: (offer.price?.currency ?? "USD").slice(0, 3).toUpperCase(),
    roomType: roomBits.length ? roomBits.join(" / ") : null,
    rateCode: offer.rateCode ?? null,
    boardType: offer.boardType ?? null,
    cancellationDescription:
      offer.policies?.cancellations?.[0]?.description?.text ?? null,
    paymentType: offer.policies?.paymentType ?? null,
    checkedAt,
  };
}

async function getHotelOffers(
  input: TripInput,
  destinationLat: number | null | undefined,
  destinationLng: number | null | undefined,
  warnings: string[],
) {
  const checkInDate = input.start_date ? toDateOnly(input.start_date) : null;
  const checkOutDate = checkoutDate(input);
  if (!checkInDate || !checkOutDate) {
    warnings.push("Add travel dates to fetch live hotel offers.");
    return [];
  }
  if (typeof destinationLat !== "number" || typeof destinationLng !== "number") {
    warnings.push("Add destination coordinates to fetch live hotel offers.");
    return [];
  }

  const hotels = await amadeusGet<{ data?: RawHotelListItem[] }>(
    "/v1/reference-data/locations/hotels/by-geocode",
    {
      latitude: destinationLat,
      longitude: destinationLng,
      radius: Math.min(50, Math.max(1, Math.ceil((input.travel_radius_minutes ?? 45) / 3))),
      radiusUnit: "KM",
      hotelSource: "ALL",
    },
  );
  const hotelIds = (hotels.data ?? [])
    .map((hotel) => hotel.hotelId)
    .filter(Boolean)
    .slice(0, 25)
    .join(",");

  if (!hotelIds) {
    warnings.push("Amadeus did not return hotels near this destination.");
    return [];
  }

  const checkedAt = new Date().toISOString();
  const offers = await amadeusGet<{ data?: RawHotelOffer[] }>(
    "/v3/shopping/hotel-offers",
    {
      hotelIds,
      adults: Math.max(1, input.travelers),
      checkInDate,
      checkOutDate,
      roomQuantity: Math.max(1, Math.ceil(input.travelers / 2)),
      currency: input.currency,
      bestRateOnly: true,
    },
  );

  return (offers.data ?? [])
    .map((offer) => normalizeHotelOffer(offer, checkedAt))
    .filter((offer): offer is AmadeusHotelOffer => Boolean(offer))
    .sort((a, b) => a.totalAmount - b.totalAmount);
}

export async function getAmadeusTravelOffers(
  input: TripInput,
  destinationLat?: number | null,
  destinationLng?: number | null,
): Promise<AmadeusTravelOffers> {
  const checkedAt = new Date().toISOString();
  const warnings: string[] = [];
  const empty = {
    provider: "amadeus" as const,
    configured: isAmadeusConfigured(),
    enabled: isAmadeusTravelEnabled(),
    checkedAt,
    originIata: null,
    destinationIata: null,
    flightOffers: [],
    hotelOffers: [],
    warnings,
  };

  if (!isAmadeusTravelEnabled()) {
    warnings.push("Amadeus is not configured yet.");
    return empty;
  }

  const [flightResult, hotelOffers] = await Promise.all([
    getFlightOffers(input, warnings).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Amadeus flight search failed.");
      return { originIata: null, destinationIata: null, flightOffers: [] };
    }),
    getHotelOffers(input, destinationLat, destinationLng, warnings).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Amadeus hotel search failed.");
      return [];
    }),
  ]);

  return {
    ...empty,
    originIata: flightResult.originIata,
    destinationIata: flightResult.destinationIata,
    flightOffers: flightResult.flightOffers,
    hotelOffers,
    warnings: Array.from(new Set(warnings)),
  };
}
