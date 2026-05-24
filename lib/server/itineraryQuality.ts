import type { ItineraryItem, TripItinerary } from "@/types/trip";

function isFoodOrHotel(item: ItineraryItem) {
  return item.category === "hotel" || item.category === "restaurant" || item.category === "cafe";
}

function isHotelLike(item: ItineraryItem) {
  const text = [item.category, item.title, item.place.name, item.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    item.category === "hotel" ||
    text.includes("hotel") ||
    text.includes("lodging") ||
    text.includes("accommodation") ||
    text.includes("guesthouse")
  );
}

export function isGenericHotelOrRestaurantName(value?: string | null) {
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
    text.includes("hotel base") ||
    text.includes("local bistro") ||
    text.includes("local restaurant") ||
    text.includes("restaurant in ") ||
    text.includes("restaurants in ") ||
    text.includes("cafe near") ||
    text.includes("lunch in ") ||
    text.includes("dinner in ") ||
    text.includes("breakfast at a local")
  );
}

export function getSpecificPlaceIssues(itinerary: TripItinerary) {
  const issues: string[] = [];
  const allItems = itinerary.days.flatMap((day) =>
    day.items.map((item) => ({ dayNumber: day.day_number, item })),
  );
  const hotelItems = allItems.filter(({ item }) => isHotelLike(item));

  if (hotelItems.length === 0) {
    issues.push("Add one specific named hotel item to the first day as the recommended lodging base.");
  }

  for (const day of itinerary.days) {
    const hasNamedFoodStop = day.items.some(
      (item) =>
        (item.category === "restaurant" || item.category === "cafe") &&
        !isGenericHotelOrRestaurantName(item.place.name ?? item.title),
    );

    if (!hasNamedFoodStop) {
      issues.push(`Day ${day.day_number} needs at least one specific named restaurant or cafe.`);
    }
  }

  const genericItems = allItems.filter(
    ({ item }) =>
      isFoodOrHotel(item) &&
      isGenericHotelOrRestaurantName(item.place.name ?? item.title),
  );

  if (genericItems.length > 0) {
    issues.push(
      `Replace generic hotel/restaurant/cafe names with specific named places: ${genericItems
        .slice(0, 8)
        .map(({ dayNumber, item }) => `Day ${dayNumber} ${item.title}`)
        .join(", ")}.`,
    );
  }

  return Array.from(new Set(issues));
}
