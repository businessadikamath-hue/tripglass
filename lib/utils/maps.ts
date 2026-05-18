import type { TripItinerary } from "@/types/trip";

export function getMapPins(itinerary: TripItinerary) {
  return itinerary.days.flatMap((day) =>
    day.items
      .map((item, index) => ({
        ...item,
        label: `${day.day_number}${String.fromCharCode(65 + index)}`,
        dayNumber: day.day_number,
      }))
      .filter((item) => item.place.lat !== null && item.place.lng !== null),
  );
}
