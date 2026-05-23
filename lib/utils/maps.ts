import type { TripItinerary } from "@/types/trip";

function approximateCoordinate(
  destinationLat: number,
  destinationLng: number,
  dayNumber: number,
  itemIndex: number,
) {
  const angle = (((dayNumber + 1) * 47 + (itemIndex + 1) * 73) % 360) * (Math.PI / 180);
  const distance = 0.008 + (itemIndex % 4) * 0.0025;
  return {
    lat: Number((destinationLat + Math.cos(angle) * distance).toFixed(6)),
    lng: Number(
      (
        destinationLng +
        (Math.sin(angle) * distance) /
          Math.max(Math.cos((destinationLat * Math.PI) / 180), 0.35)
      ).toFixed(6),
    ),
  };
}

export function getMapPins(
  itinerary: TripItinerary,
  fallback?: { destinationLat?: number | null; destinationLng?: number | null; destinationText?: string | null },
) {
  const destinationCenter =
    typeof fallback?.destinationLat === "number" &&
    typeof fallback?.destinationLng === "number"
      ? { lat: fallback.destinationLat, lng: fallback.destinationLng }
      : null;

  return itinerary.days.flatMap((day) =>
    day.items
      .map((item, index) => {
        const hasItemCoordinates =
          typeof item.place.lat === "number" && typeof item.place.lng === "number";
        const estimated =
          !hasItemCoordinates && destinationCenter
            ? approximateCoordinate(
                destinationCenter.lat,
                destinationCenter.lng,
                day.day_number,
                index,
              )
            : null;

        return {
          ...item,
          place: estimated
            ? {
                ...item.place,
                lat: estimated.lat,
                lng: estimated.lng,
                address:
                  item.place.address ??
                  `Estimated area in ${fallback?.destinationText ?? itinerary.destination}`,
              }
            : item.place,
          label: `${day.day_number}${String.fromCharCode(65 + index)}`,
          dayNumber: day.day_number,
          coordinateConfidence: hasItemCoordinates ? "place" : "estimated",
        };
      })
      .filter((item) => item.place.lat !== null && item.place.lng !== null),
  );
}
