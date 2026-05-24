import { searchPlacesByText } from "@/lib/server/googlePlaces";
import type { ItineraryItem, TripInput, TripItinerary } from "@/types/trip";

function hasCoordinates(place: { lat: number | null; lng: number | null }) {
  return typeof place.lat === "number" && typeof place.lng === "number";
}

function approximateCoordinate(
  destinationLat: number,
  destinationLng: number,
  dayNumber: number,
  itemIndex: number,
) {
  const angle = (((dayNumber + 1) * 47 + (itemIndex + 1) * 73) % 360) * (Math.PI / 180);
  const distance = 0.008 + (itemIndex % 4) * 0.0025;
  const lat = destinationLat + Math.cos(angle) * distance;
  const lng =
    destinationLng +
    (Math.sin(angle) * distance) /
      Math.max(Math.cos((destinationLat * Math.PI) / 180), 0.35);

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
}

function mapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function isGenericPlaceName(value?: string | null) {
  const text = value?.trim().toLowerCase();
  if (!text) return true;
  return (
    text.length < 4 ||
    text.includes("near your accommodation") ||
    text.includes("central hotel") ||
    text.includes("hotel area") ||
    text.includes("local hotel") ||
    text.includes("suggested hotel") ||
    text.includes("well located hotel") ||
    text.includes("local bistro") ||
    text.includes("local restaurant") ||
    text.includes("restaurant in ") ||
    text.includes("restaurants in ") ||
    text.includes("cafe near") ||
    text.includes("café near") ||
    text.includes("lunch in ") ||
    text.includes("dinner in ") ||
    text.includes("breakfast at a local")
  );
}

function isFoodLike(item: ItineraryItem) {
  return item.category === "restaurant" || item.category === "cafe";
}

function isAccommodationLike(item: ItineraryItem) {
  const text = [item.category, item.title, item.place.name, item.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return (
    text.includes("hotel") ||
    text.includes("lodging") ||
    text.includes("accommodation") ||
    text.includes("guesthouse")
  );
}

function shouldResolveSpecificPlace(item: ItineraryItem) {
  if (!isAccommodationLike(item) && !isFoodLike(item)) return false;
  return true;
}

function specificPlaceQuery(item: ItineraryItem, destination: string) {
  if (isAccommodationLike(item)) {
    return isGenericPlaceName(item.place.name)
      ? `specific well rated hotel in ${destination}`
      : `${item.place.name} hotel ${destination}`;
  }

  const meal = item.category === "cafe" ? "cafe" : "restaurant";
  return isGenericPlaceName(item.place.name)
    ? `specific ${meal} in ${destination} for ${item.title}`
    : `${item.place.name} ${destination}`;
}

async function findFirstMappedPlace(
  queries: string[],
  destinationCenter: { lat: number; lng: number } | null,
) {
  for (const query of queries) {
    const googlePlace = await searchPlacesByText(query, destinationCenter ?? undefined)
      .then((places) => places.find((place) => hasCoordinates(place)))
      .catch(() => undefined);
    if (googlePlace) return googlePlace;
  }
  return undefined;
}

function normalizeAccommodationItem(
  item: ItineraryItem,
  accommodationBudget: number,
  currency: string,
): ItineraryItem {
  if (!isAccommodationLike(item)) return item;

  return {
    ...item,
    category: "hotel",
    estimated_cost: {
      ...item.estimated_cost,
      amount:
        item.estimated_cost.amount && item.estimated_cost.amount > 0
          ? item.estimated_cost.amount
          : accommodationBudget,
      currency,
      note:
        item.estimated_cost.note ||
        "Accommodation estimate only. Not live availability or a booking quote.",
    },
    booking_note:
      item.booking_note ||
      "Check live rates and cancellation policies on the hotel or booking site before reserving.",
  };
}

function keepSingleHotelBase(itinerary: TripItinerary): TripItinerary {
  const hotelItems = itinerary.days.flatMap((day) =>
    day.items
      .filter(isAccommodationLike)
      .map((item) => ({ dayNumber: day.day_number, item })),
  );

  if (hotelItems.length <= 1) return itinerary;

  const selected =
    hotelItems.find(({ item }) => item.place.source === "google_places")?.item ??
    hotelItems[0].item;

  const normalizedHotel = {
    ...selected,
    start_time: selected.start_time || "15:00",
    end_time: selected.end_time || "15:30",
    title: selected.place.name ?? selected.title,
    category: "hotel" as const,
    transit_note:
      selected.transit_note ||
      "Use this hotel as the daily start/end base when comparing transit times.",
  };

  const [firstDay, ...restDays] = itinerary.days.map((day) => ({
    ...day,
    items: day.items.filter((item) => !isAccommodationLike(item)),
  }));

  return {
    ...itinerary,
    days: [
      {
        ...firstDay,
        items: [normalizedHotel, ...firstDay.items],
      },
      ...restDays,
    ],
  };
}

export async function enrichItineraryPlaces(
  itinerary: TripItinerary,
  input: Pick<TripInput, "destination_text">,
  destinationLat?: number | null,
  destinationLng?: number | null,
): Promise<TripItinerary> {
  const destinationCenter =
    typeof destinationLat === "number" && typeof destinationLng === "number"
      ? { lat: destinationLat, lng: destinationLng }
      : null;
  const accommodationBudget = itinerary.budget_breakdown.accommodation ?? 0;

  const days = await Promise.all(
    itinerary.days.map(async (day) => {
      const items = await Promise.all(
        day.items.map(async (item, itemIndex) => {
          item = normalizeAccommodationItem(item, accommodationBudget, itinerary.currency);
          const needsSpecificReplacement = shouldResolveSpecificPlace(item);
          if (hasCoordinates(item.place) && !needsSpecificReplacement) return item;

          const query = needsSpecificReplacement
            ? specificPlaceQuery(item, input.destination_text)
            : [item.place.name, item.place.address, item.title, input.destination_text]
                .filter(Boolean)
                .join(", ");
          const fallbackQuery = isAccommodationLike(item)
            ? `best hotels in ${input.destination_text}`
            : isFoodLike(item)
              ? `best restaurants in ${input.destination_text}`
              : query;
          const googlePlace = await findFirstMappedPlace(
            Array.from(new Set([query, fallbackQuery])),
            destinationCenter,
          );

          if (googlePlace && googlePlace.lat !== null && googlePlace.lng !== null) {
            return {
              ...item,
              title:
                isAccommodationLike(item) || isFoodLike(item)
                  ? googlePlace.name
                  : item.title,
              place: {
                ...item.place,
                name: googlePlace.name ?? item.place.name,
                google_place_id: googlePlace.place_id || item.place.google_place_id,
                address: googlePlace.address ?? item.place.address,
                lat: googlePlace.lat,
                lng: googlePlace.lng,
                google_maps_url: googlePlace.google_maps_url ?? mapsSearchUrl(query),
                source: "google_places" as const,
              },
            };
          }

          if (hasCoordinates(item.place)) {
            return {
              ...item,
              place: {
                ...item.place,
                source:
                  isAccommodationLike(item) || isFoodLike(item)
                    ? ("ai_estimate" as const)
                    : item.place.source,
              },
            };
          }

          if (!destinationCenter) {
            return {
              ...item,
              place: {
                ...item.place,
                google_maps_url: item.place.google_maps_url ?? mapsSearchUrl(query),
              },
            };
          }

          const estimated = approximateCoordinate(
            destinationCenter.lat,
            destinationCenter.lng,
            day.day_number,
            itemIndex,
          );
          return {
            ...item,
            place: {
              ...item.place,
              lat: estimated.lat,
              lng: estimated.lng,
              address: item.place.address ?? `Estimated area in ${input.destination_text}`,
              google_maps_url: item.place.google_maps_url ?? mapsSearchUrl(query),
              source:
                item.place.source === "google_places"
                  ? ("google_places" as const)
                  : ("ai_estimate" as const),
            },
          };
        }),
      );

      return { ...day, items };
    }),
  );

  const enriched = keepSingleHotelBase({ ...itinerary, days });
  return ensureHotelRecommendation(enriched, input, destinationCenter);
}

async function ensureHotelRecommendation(
  itinerary: TripItinerary,
  input: Pick<TripInput, "destination_text">,
  destinationCenter: { lat: number; lng: number } | null,
) {
  const alreadyHasHotel = itinerary.days.some((day) =>
    day.items.some(
      (item) =>
        item.category === "hotel" ||
        item.title.toLowerCase().includes("hotel") ||
        item.place.name?.toLowerCase().includes("hotel"),
    ),
  );
  const accommodationBudget = itinerary.budget_breakdown.accommodation ?? 0;
  if (alreadyHasHotel || accommodationBudget <= 0 || itinerary.days.length === 0) {
    return itinerary;
  }

  const query = `specific well rated hotel in ${input.destination_text}`;
  const googlePlace = await findFirstMappedPlace(
    [
      query,
      `best hotels in ${input.destination_text}`,
      `central hotels in ${input.destination_text}`,
    ],
    destinationCenter,
  );

  if (!googlePlace) {
    return itinerary;
  }

  const fallback = destinationCenter
    ? approximateCoordinate(destinationCenter.lat, destinationCenter.lng, 1, 99)
    : { lat: null, lng: null };

  const hotelItem: ItineraryItem = {
    start_time: "15:00",
    end_time: "15:30",
    title: "Suggested hotel base",
    description:
      "A practical accommodation base for this itinerary. Verify nightly rates, amenities, and availability before booking.",
    category: "hotel",
    place: {
      name: googlePlace.name,
      google_place_id: googlePlace.place_id,
      address: googlePlace.address ?? null,
      lat: googlePlace.lat ?? fallback.lat,
      lng: googlePlace.lng ?? fallback.lng,
      google_maps_url: googlePlace.google_maps_url ?? mapsSearchUrl(query),
      source: "google_places",
    },
    estimated_cost: {
      amount: accommodationBudget,
      currency: itinerary.currency,
      confidence: "medium",
      note: "Accommodation estimate only. Not live availability or a booking quote.",
    },
    why_it_fits:
      "Keeps the trip anchored near the planned neighborhoods while preserving the overall budget.",
    transit_note: "Use this as the daily start/end base when comparing transit times.",
    accessibility_note: "Confirm room, elevator, and entrance accessibility directly with the hotel.",
    booking_note: "Check live rates and cancellation policies on the hotel or booking site before reserving.",
  };

  const [firstDay, ...restDays] = itinerary.days;
  return {
    ...itinerary,
    days: [
      {
        ...firstDay,
        items: [hotelItem, ...firstDay.items],
      },
      ...restDays,
    ],
  };
}
