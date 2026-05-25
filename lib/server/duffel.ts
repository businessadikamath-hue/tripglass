import { addDays, formatISO, isAfter, parseISO } from "date-fns";
import type {
  DuffelFlightOffer,
  DuffelFlightSegment,
  DuffelHotelOffer,
  DuffelTravelOffers,
} from "@/types/duffel";
import type { TripInput } from "@/types/trip";

type DuffelError = {
  errors?: Array<{ title?: string; message?: string; detail?: string }>;
};

type RawDuffelOffer = {
  id?: string;
  expires_at?: string | null;
  total_amount?: string;
  total_currency?: string;
  owner?: { name?: string | null };
  slices?: Array<{
    duration?: string | null;
    origin?: { iata_code?: string };
    destination?: { iata_code?: string };
    segments?: Array<{
      marketing_carrier_flight_number?: string | null;
      operating_carrier?: { name?: string | null };
      origin?: { iata_code?: string };
      destination?: { iata_code?: string };
      departing_at?: string;
      arriving_at?: string;
      duration?: string | null;
    }>;
  }>;
};

type RawDuffelStaySearchResult = {
  id?: string;
  cheapest_rate_total_amount?: string | null;
  cheapest_rate_total_currency?: string | null;
  accommodation?: {
    id?: string;
    name?: string;
    location?: {
      geographic_coordinates?: { latitude?: number; longitude?: number };
    };
    address?: {
      line_one?: string | null;
      city_name?: string | null;
      region?: string | null;
      postal_code?: string | null;
      country_code?: string | null;
    };
  };
};

type DuffelStayAddress = NonNullable<
  NonNullable<RawDuffelStaySearchResult["accommodation"]>["address"]
>;

const COMMON_IATA: Record<string, string> = {
  atlanta: "ATL",
  bangkok: "BKK",
  barcelona: "BCN",
  boston: "BOS",
  chicago: "CHI",
  "chicago, il": "CHI",
  dubai: "DXB",
  dublin: "DUB",
  honolulu: "HNL",
  istanbul: "IST",
  "las vegas": "LAS",
  london: "LON",
  "los angeles": "LAX",
  madrid: "MAD",
  miami: "MIA",
  milan: "MIL",
  "new york": "NYC",
  "new york city": "NYC",
  orlando: "ORL",
  paris: "PAR",
  rome: "ROM",
  "san francisco": "SFO",
  seattle: "SEA",
  singapore: "SIN",
  sydney: "SYD",
  tokyo: "TYO",
  toronto: "YTO",
  vancouver: "YVR",
  washington: "WAS",
  "washington dc": "WAS",
};

export function isDuffelConfigured() {
  return Boolean(process.env.DUFFEL_ACCESS_TOKEN?.trim());
}

export function isDuffelTravelEnabled() {
  return isDuffelConfigured() && process.env.ENABLE_DUFFEL_TRAVEL !== "false";
}

function duffelTimeoutMs() {
  const parsed = Number(process.env.DUFFEL_TIMEOUT_MS);
  return Number.isFinite(parsed) ? Math.max(2000, Math.min(25000, parsed)) : 12000;
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

function resolveIataCode(value?: string | null) {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  const direct = trimmed.match(/\b[A-Z]{3}\b/i)?.[0]?.toUpperCase();
  if (direct) return direct;

  const normalized = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9,\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return COMMON_IATA[normalized] ?? COMMON_IATA[normalized.split(",")[0]?.trim() ?? ""] ?? null;
}

async function duffelFetch<T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string | number | boolean | null | undefined>,
) {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("DUFFEL_KEY_MISSING");

  const url = new URL(`https://api.duffel.com${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== null && value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "Content-Type": "application/json",
      "Duffel-Version": process.env.DUFFEL_API_VERSION?.trim() || "v2",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(duffelTimeoutMs()),
  });
  const payload = (await response.json().catch(() => ({}))) as T & DuffelError;

  if (!response.ok) {
    const message =
      payload.errors?.[0]?.message ||
      payload.errors?.[0]?.detail ||
      payload.errors?.[0]?.title ||
      `Duffel request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function normalizeFlightOffer(
  offer: RawDuffelOffer,
  originIata: string,
  destinationIata: string,
  checkedAt: string,
): DuffelFlightOffer | null {
  const totalAmount = toNumber(offer.total_amount);
  if (!offer.id || totalAmount === null) return null;

  return {
    id: offer.id,
    source: "duffel",
    originIata,
    destinationIata,
    totalAmount,
    currency: (offer.total_currency ?? "USD").slice(0, 3).toUpperCase(),
    ownerName: offer.owner?.name ?? null,
    expiresAt: offer.expires_at ?? null,
    checkedAt,
    slices:
      offer.slices?.map((slice) => ({
        duration: slice.duration ?? null,
        segments:
          slice.segments?.map(
            (segment): DuffelFlightSegment => ({
              carrierName: segment.operating_carrier?.name ?? null,
              flightNumber: segment.marketing_carrier_flight_number ?? null,
              originIata: segment.origin?.iata_code ?? slice.origin?.iata_code ?? "",
              destinationIata:
                segment.destination?.iata_code ?? slice.destination?.iata_code ?? "",
              departureAt: segment.departing_at ?? "",
              arrivalAt: segment.arriving_at ?? "",
              duration: segment.duration ?? null,
            }),
          ) ?? [],
      })) ?? [],
  };
}

async function getFlightOffers(input: TripInput, warnings: string[]) {
  if (!input.include_travel_costs) {
    return { originIata: null, destinationIata: null, flightOffers: [] };
  }
  if (!input.starting_city?.trim()) {
    warnings.push("Add a starting city or airport code to fetch live flight offers.");
    return { originIata: null, destinationIata: null, flightOffers: [] };
  }
  if (!input.start_date) {
    warnings.push("Add travel dates to fetch live flight offers.");
    return { originIata: null, destinationIata: null, flightOffers: [] };
  }

  const originIata = resolveIataCode(input.starting_city);
  const destinationIata = resolveIataCode(input.destination_text);
  if (!originIata || !destinationIata) {
    warnings.push(
      "Duffel needs an airport or city IATA code for live flight pricing. AI flight estimates were used instead.",
    );
    return { originIata, destinationIata, flightOffers: [] };
  }

  const slices = [
    {
      origin: originIata,
      destination: destinationIata,
      departure_date: toDateOnly(input.start_date),
    },
  ];
  if (input.end_date) {
    slices.push({
      origin: destinationIata,
      destination: originIata,
      departure_date: toDateOnly(input.end_date),
    });
  }

  const checkedAt = new Date().toISOString();
  const payload = await duffelFetch<{ data?: { offers?: RawDuffelOffer[] } }>(
    "/air/offer_requests",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          slices,
          passengers: Array.from({ length: Math.max(1, input.travelers) }, () => ({
            type: "adult",
          })),
          cabin_class:
            input.travel_style?.toLowerCase().includes("business") ||
            input.travel_style?.toLowerCase().includes("luxury")
              ? "business"
              : "economy",
        },
      }),
    },
    { return_offers: true, supplier_timeout: Math.min(10000, duffelTimeoutMs() - 1000) },
  );

  return {
    originIata,
    destinationIata,
    flightOffers: (payload.data?.offers ?? [])
      .map((offer) => normalizeFlightOffer(offer, originIata, destinationIata, checkedAt))
      .filter((offer): offer is DuffelFlightOffer => Boolean(offer))
      .sort((a, b) => a.totalAmount - b.totalAmount)
      .slice(0, 5),
  };
}

function formatAddress(address?: DuffelStayAddress) {
  if (!address) return null;
  return [
    address.line_one,
    address.city_name,
    address.region,
    address.postal_code,
    address.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeHotelOffer(
  raw: RawDuffelStaySearchResult,
  input: TripInput,
  checkedAt: string,
): DuffelHotelOffer | null {
  const totalAmount = toNumber(raw.cheapest_rate_total_amount);
  const hotel = raw.accommodation;
  if (!raw.id || !hotel?.id || !hotel.name || totalAmount === null) return null;

  return {
    id: raw.id,
    source: "duffel",
    hotelId: hotel.id,
    hotelName: hotel.name,
    address: formatAddress(hotel.address),
    lat: toNumber(hotel.location?.geographic_coordinates?.latitude),
    lng: toNumber(hotel.location?.geographic_coordinates?.longitude),
    checkInDate: input.start_date ? toDateOnly(input.start_date) : "",
    checkOutDate: checkoutDate(input) ?? "",
    totalAmount,
    currency: (raw.cheapest_rate_total_currency ?? input.currency).slice(0, 3).toUpperCase(),
    roomType: "Cheapest available rate",
    cancellationDescription: null,
    checkedAt,
  };
}

async function getHotelOffers(
  input: TripInput,
  destinationLat: number | null | undefined,
  destinationLng: number | null | undefined,
  warnings: string[],
) {
  if (!input.include_travel_costs) return [];
  const checkInDate = input.start_date ? toDateOnly(input.start_date) : null;
  const checkOutDate = checkoutDate(input);
  if (!checkInDate || !checkOutDate) {
    warnings.push("Add travel dates to fetch live hotel offers.");
    return [];
  }
  if (typeof destinationLat !== "number" || typeof destinationLng !== "number") {
    warnings.push("Destination coordinates are required for live hotel search.");
    return [];
  }

  const checkedAt = new Date().toISOString();
  const payload = await duffelFetch<{ data?: { results?: RawDuffelStaySearchResult[] } }>(
    "/stays/search",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          rooms: Math.max(1, Math.ceil(input.travelers / 2)),
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests: Array.from({ length: Math.max(1, input.travelers) }, () => ({
            type: "adult",
          })),
          location: {
            radius: Math.min(
              20,
              Math.max(2, Math.ceil((input.travel_radius_minutes ?? 45) / 6)),
            ),
            geographic_coordinates: {
              latitude: destinationLat,
              longitude: destinationLng,
            },
          },
        },
      }),
    },
  );

  return (payload.data?.results ?? [])
    .map((offer) => normalizeHotelOffer(offer, input, checkedAt))
    .filter((offer): offer is DuffelHotelOffer => Boolean(offer))
    .sort((a, b) => a.totalAmount - b.totalAmount)
    .slice(0, 8);
}

export async function getDuffelTravelOffers(
  input: TripInput,
  destinationLat?: number | null,
  destinationLng?: number | null,
): Promise<DuffelTravelOffers> {
  const checkedAt = new Date().toISOString();
  const warnings: string[] = [];
  const empty = {
    provider: "duffel" as const,
    configured: isDuffelConfigured(),
    enabled: isDuffelTravelEnabled(),
    checkedAt,
    originIata: null,
    destinationIata: null,
    flightOffers: [],
    hotelOffers: [],
    warnings,
  };

  if (!isDuffelTravelEnabled()) {
    warnings.push("Duffel is not configured. AI estimates were used for flights and hotels.");
    return empty;
  }

  const [flightResult, hotelOffers] = await Promise.all([
    getFlightOffers(input, warnings).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Duffel flight search failed.");
      return { originIata: null, destinationIata: null, flightOffers: [] };
    }),
    getHotelOffers(input, destinationLat, destinationLng, warnings).catch((error) => {
      warnings.push(error instanceof Error ? error.message : "Duffel hotel search failed.");
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
