import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getDuffelTravelOffers, isDuffelConfigured } from "@/lib/server/duffel";
import { searchDestinationsFallback } from "@/lib/server/geocoding";
import {
  generateItineraryWithGemini,
  getGeminiModel,
  isGeminiConfigured,
} from "@/lib/server/gemini";
import { getCandidatePlaces } from "@/lib/server/googlePlaces";
import { enrichItineraryPlaces } from "@/lib/server/placeEnrichment";
import {
  generateItineraryWithOpenAI,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/server/openai";
import { getDailyWeather } from "@/lib/server/weather";
import type { DuffelTravelOffers } from "@/types/duffel";
import type { BudgetStatus, TripInput, TripItinerary } from "@/types/trip";
import type { LivePricingSummary } from "@/types/travel";

export function getAIProvider() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (provider === "gemini" || provider === "openai") return provider;
  if (isGeminiConfigured()) return "gemini";
  return "openai";
}

export function isConfiguredAIProviderAvailable() {
  return getAIProvider() === "gemini" ? isGeminiConfigured() : isOpenAIConfigured();
}

export function getConfiguredAIModel() {
  return getAIProvider() === "gemini" ? getGeminiModel() : getOpenAIModel();
}

export function createShareSlug(destination: string) {
  const base = destination
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36);
  return `${base || "trip"}-${randomUUID().slice(0, 8)}`;
}

export async function generateTrip(input: TripInput) {
  let destinationLat = input.destination_lat;
  let destinationLng = input.destination_lng;

  if (destinationLat === null || destinationLat === undefined || destinationLng === null || destinationLng === undefined) {
    const fallbackDestination = await searchDestinationsFallback(input.destination_text).catch(
      () => [],
    );
    destinationLat = fallbackDestination[0]?.lat ?? null;
    destinationLng = fallbackDestination[0]?.lng ?? null;
  }

  const weather = await getDailyWeather(
    destinationLat,
    destinationLng,
    input.start_date,
    input.end_date,
    input.days_count,
  ).catch(() => []);

  const candidatePlaces = await getCandidatePlaces({
    destination: input.destination_text,
    lat: destinationLat,
    lng: destinationLng,
    interests: input.interests,
    foodPreferences: input.food_preferences,
    travelRadiusMinutes: input.travel_radius_minutes,
    rentalCar: input.rental_car,
  }).catch(() => []);

  const travelOffers = await getDuffelTravelOffers(
    input,
    destinationLat,
    destinationLng,
  ).catch(
    (): DuffelTravelOffers => ({
      provider: "duffel",
      configured: isDuffelConfigured(),
      enabled: false,
      checkedAt: new Date().toISOString(),
      originIata: null,
      destinationIata: null,
      flightOffers: [],
      hotelOffers: [],
      warnings: ["Duffel live offer lookup failed. AI estimates were used instead."],
    }),
  );

  let itinerary: TripItinerary;

  if (!isConfiguredAIProviderAvailable()) {
    throw new Error(`${getAIProvider().toUpperCase()}_KEY_MISSING`);
  } else {
    itinerary =
      getAIProvider() === "gemini"
        ? await generateItineraryWithGemini({
            input,
            candidatePlaces,
            weather,
            travelOffers,
          })
        : await generateItineraryWithOpenAI({
            input,
            candidatePlaces,
            weather,
            travelOffers,
          });
  }

  itinerary = ensureBudgetPlanningEstimates(
    applyWeatherForecast(itinerary, weather),
    input,
  );

  itinerary = await enrichItineraryPlaces(
    itinerary,
    input,
    destinationLat,
    destinationLng,
  );

  itinerary = applyLiveTravelOffers(itinerary, input, travelOffers);

  const supabase = await createClient();
  let tripId: string | null = null;
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (supabase && user) {
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: user.id,
        title: itinerary.title,
        destination_text: input.destination_text,
        destination_place_id: input.destination_place_id ?? null,
        destination_lat: destinationLat ?? null,
        destination_lng: destinationLng ?? null,
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        days_count: input.days_count,
        budget_amount: input.budget_amount ?? null,
        currency: input.currency,
        travelers: input.travelers,
        travel_style: input.travel_style,
        pace: input.pace,
        interests: input.interests,
        food_preferences: input.food_preferences,
        accessibility_needs: input.accessibility_needs,
        must_see: input.must_see,
        avoid: input.avoid,
        status: "generated",
        input_snapshot: input,
        itinerary_json: itinerary,
        ai_model: getConfiguredAIModel(),
        estimated_total_cost: itinerary.estimated_total_cost,
      })
      .select("id")
      .single();

    if (error) throw error;
    tripId = data.id;
  }

  return {
    itinerary,
    tripId,
    guestTripId: tripId ? null : `guest-${randomUUID().slice(0, 12)}`,
    integrations: {
      openai: isOpenAIConfigured(),
      gemini: isGeminiConfigured(),
      aiProvider: getAIProvider(),
      googlePlaces: Boolean(process.env.GOOGLE_MAPS_API_KEY),
      duffel: travelOffers.configured,
      duffelLiveOffers:
        travelOffers.flightOffers.length > 0 || travelOffers.hotelOffers.length > 0,
      supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      weather: true,
    },
  };
}

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function estimateAccommodation(input: TripInput) {
  if (input.include_travel_costs === false) return 0;
  const roomCount = Math.max(1, Math.ceil(input.travelers / 2));
  const nights = Math.max(1, input.days_count - 1);
  const baseline = roomCount * nights * 170;
  if (!input.budget_amount) return roundToTen(baseline);

  const budgetBased = input.budget_amount * 0.32;
  return roundToTen(Math.max(Math.min(budgetBased, input.budget_amount * 0.45), baseline * 0.55));
}

function estimateFlights(input: TripInput) {
  if (input.include_travel_costs === false) return 0;
  const perTraveler = input.starting_city?.trim() ? 360 : 280;
  const baseline = perTraveler * input.travelers;
  if (!input.budget_amount) return roundToTen(baseline);

  const budgetBased = input.budget_amount * 0.3;
  return roundToTen(Math.max(Math.min(budgetBased, input.budget_amount * 0.45), baseline * 0.6));
}

function getBudgetStatus(total: number, budget?: number | null): BudgetStatus {
  if (!budget) return "unknown";
  const ratio = total / budget;
  if (ratio <= 0.9) return "under_budget";
  if (ratio <= 1.1) return "near_budget";
  return "over_budget";
}

function ensureBudgetPlanningEstimates(itinerary: TripItinerary, input: TripInput) {
  const breakdown = itinerary.budget_breakdown;
  const accommodation =
    input.include_travel_costs === false
      ? 0
      : breakdown.accommodation && breakdown.accommodation > 0
        ? breakdown.accommodation
        : estimateAccommodation(input);
  const localTransit = breakdown.transit ?? 0;
  const flightEstimate = estimateFlights(input);
  const transit = localTransit >= flightEstimate ? localTransit : localTransit + flightEstimate;
  const food = breakdown.food ?? 0;
  const activities = breakdown.activities ?? 0;
  const miscellaneous = breakdown.miscellaneous ?? 0;
  const estimatedTotal = food + accommodation + activities + transit + miscellaneous;
  const noteParts = [
    breakdown.notes,
    input.include_travel_costs === false
      ? "Flight and hotel costs were excluded from this budget by user preference."
      : `Hotel is a planning estimate, not live room pricing.`,
    input.include_travel_costs === false
      ? null
      : `Transit includes an estimated flight allowance of ${input.currency} ${flightEstimate}; verify live fares before booking.`,
  ].filter(Boolean);

  return {
    ...itinerary,
    estimated_total_cost: estimatedTotal,
    budget_status: getBudgetStatus(estimatedTotal, input.budget_amount),
    warnings: Array.from(
      new Set([
        ...itinerary.warnings,
        "Hotel and flight costs are planning estimates, not live prices or availability.",
        input.include_travel_costs === false
          ? "Flight and hotel costs are not included in this budget."
          : "",
      ]),
    ).filter(Boolean),
    budget_breakdown: {
      ...breakdown,
      food,
      accommodation,
      activities,
      transit,
      miscellaneous,
      notes: noteParts.join(" "),
    },
  };
}

function firstFlightSegment(offers: DuffelTravelOffers) {
  return offers.flightOffers[0]?.slices[0]?.segments[0] ?? null;
}

function livePricingSummary(offers: DuffelTravelOffers): LivePricingSummary | undefined {
  const flight = offers.flightOffers[0];
  const hotel = offers.hotelOffers[0];
  if (!flight && !hotel) return undefined;

  const firstSegment = firstFlightSegment(offers);
  const lastOutboundSegments = offers.flightOffers[0]?.slices[0]?.segments ?? [];
  const lastSegment = lastOutboundSegments[lastOutboundSegments.length - 1] ?? null;

  return {
    provider: "duffel",
    checked_at: offers.checkedAt,
    flight_offer: flight
      ? {
          id: flight.id,
          origin_iata: flight.originIata,
          destination_iata: flight.destinationIata,
          total_amount: flight.totalAmount,
          currency: flight.currency,
          airline_name: flight.ownerName,
          departure_at: firstSegment?.departureAt ?? null,
          arrival_at: lastSegment?.arrivalAt ?? null,
          expires_at: flight.expiresAt,
        }
      : null,
    hotel_offer: hotel
      ? {
          id: hotel.id,
          hotel_id: hotel.hotelId,
          hotel_name: hotel.hotelName,
          total_amount: hotel.totalAmount,
          currency: hotel.currency,
          check_in_date: hotel.checkInDate,
          check_out_date: hotel.checkOutDate,
          lat: hotel.lat,
          lng: hotel.lng,
        }
      : null,
    notes: [
      "Flight prices came from Duffel live offers and hotel prices may come from LiteAPI or Duffel live offers at generation time.",
      "Prices, fare rules, room availability, and cancellation terms can change before booking.",
      ...offers.warnings,
    ],
  };
}

function applyLiveTravelOffers(
  itinerary: TripItinerary,
  input: TripInput,
  offers: DuffelTravelOffers,
): TripItinerary {
  const flight = offers.flightOffers[0];
  const hotel = offers.hotelOffers[0];
  const livePricing = livePricingSummary(offers);
  if (!flight && !hotel) {
    return offers.warnings.length
      ? {
          ...itinerary,
          warnings: Array.from(new Set([...itinerary.warnings, ...offers.warnings])),
        }
      : itinerary;
  }

  const estimatedFlight = estimateFlights(input);
  const currentTransit = itinerary.budget_breakdown.transit ?? 0;
  const localTransit = flight
    ? Math.max(0, currentTransit - estimatedFlight)
    : currentTransit;
  const transit = flight ? localTransit + flight.totalAmount : currentTransit;
  const accommodation = hotel
    ? hotel.totalAmount
    : itinerary.budget_breakdown.accommodation ?? 0;
  const food = itinerary.budget_breakdown.food ?? 0;
  const activities = itinerary.budget_breakdown.activities ?? 0;
  const miscellaneous = itinerary.budget_breakdown.miscellaneous ?? 0;
  const estimatedTotal = food + accommodation + activities + transit + miscellaneous;
  const noteParts = [
    itinerary.budget_breakdown.notes,
    flight
      ? `Flight pricing uses Duffel offer ${flight.id} checked at ${offers.checkedAt}.`
      : null,
    hotel
      ? `Hotel pricing uses ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} live offer ${hotel.id} for ${hotel.hotelName}.`
      : null,
    "Live offers can change before booking.",
  ].filter(Boolean);

  let replacedHotel = false;
  const days = itinerary.days.map((day, dayIndex) => {
    if (!hotel) return day;
    const items = day.items.map((item) => {
      if (replacedHotel || item.category !== "hotel") return item;
      replacedHotel = true;
      return {
        ...item,
        title: hotel.hotelName,
        description:
          `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer selected as the lodging base for this itinerary. Verify final price and availability before booking.`,
        place: {
          ...item.place,
          name: hotel.hotelName,
          google_place_id: item.place.google_place_id,
          address: hotel.address ?? item.place.address,
          lat: hotel.lat ?? item.place.lat,
          lng: hotel.lng ?? item.place.lng,
          source: hotel.source,
        },
        estimated_cost: {
          amount: hotel.totalAmount,
          currency: hotel.currency,
          confidence: "high" as const,
          note: `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer at generation time; verify before booking.`,
        },
        booking_note:
          hotel.cancellationDescription ||
          `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer. Verify final rate, taxes, room terms, and availability before booking.`,
      };
    });

    if (replacedHotel || dayIndex !== 0) return { ...day, items };

    replacedHotel = true;
    return {
      ...day,
      items: [
        {
          start_time: "15:00",
          end_time: "15:30",
          title: hotel.hotelName,
          description:
            `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer selected as the lodging base for this itinerary. Verify final price and availability before booking.`,
          category: "hotel" as const,
          place: {
            name: hotel.hotelName,
            google_place_id: null,
            address: hotel.address,
            lat: hotel.lat,
            lng: hotel.lng,
            google_maps_url:
              hotel.lat !== null && hotel.lng !== null
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${hotel.lat},${hotel.lng}`,
                  )}`
                : null,
            source: hotel.source,
          },
          estimated_cost: {
            amount: hotel.totalAmount,
            currency: hotel.currency,
            confidence: "high" as const,
            note: `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer at generation time; verify before booking.`,
          },
          why_it_fits:
            "It gives the itinerary a concrete lodging base backed by a live hotel offer.",
          transit_note: "Use this hotel as the daily start/end base for route planning.",
          accessibility_note: "Confirm room and property accessibility directly before booking.",
          booking_note:
            hotel.cancellationDescription ||
            `Live ${hotel.source === "liteapi" ? "LiteAPI" : "Duffel"} hotel offer. Verify final rate, taxes, room terms, and availability before booking.`,
        },
        ...items,
      ],
    };
  });

  return {
    ...itinerary,
    days,
    estimated_total_cost: estimatedTotal,
    budget_status: getBudgetStatus(estimatedTotal, input.budget_amount),
    live_pricing: livePricing,
    warnings: Array.from(
      new Set([
        ...itinerary.warnings.filter(
          (warning) =>
            !warning.toLowerCase().includes("hotel and flight costs are planning estimates"),
        ),
        "Flight prices use Duffel and hotel prices use LiteAPI/Duffel live offers where available, but can change before booking.",
        ...offers.warnings,
      ]),
    ),
    budget_breakdown: {
      ...itinerary.budget_breakdown,
      accommodation,
      transit,
      food,
      activities,
      miscellaneous,
      notes: noteParts.join(" "),
    },
  };
}

function packingTipFor(condition: string | null, high: number | null, low: number | null) {
  const lower = condition?.toLowerCase() ?? "";
  if (lower.includes("rain") || lower.includes("drizzle") || lower.includes("thunder")) {
    return "Pack a compact umbrella or rain shell and choose shoes that handle wet streets.";
  }
  if (high !== null && high >= 28) {
    return "Bring a refillable water bottle, sunscreen, and breathable layers.";
  }
  if (low !== null && low <= 8) {
    return "Bring a warm layer, especially for early starts and evening plans.";
  }
  return "Bring comfortable walking shoes and one light layer for changing conditions.";
}

function applyWeatherForecast(itinerary: TripItinerary, weather: Awaited<ReturnType<typeof getDailyWeather>>) {
  if (weather.length === 0) return itinerary;

  return {
    ...itinerary,
    days: itinerary.days.map((day, index) => {
      const forecast = weather[index] ?? weather[weather.length - 1];
      if (!forecast) return day;

      return {
        ...day,
        date: day.date ?? forecast.date,
        weather: {
          available: forecast.available,
          condition: forecast.condition,
          high_temp_c: forecast.high_temp_c,
          low_temp_c: forecast.low_temp_c,
          packing_tip: packingTipFor(
            forecast.condition,
            forecast.high_temp_c,
            forecast.low_temp_c,
          ),
        },
      };
    }),
  };
}
