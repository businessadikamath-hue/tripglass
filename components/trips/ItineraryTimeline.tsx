import { ItineraryDay } from "@/components/trips/ItineraryDay";
import type { TripItinerary } from "@/types/trip";

export function ItineraryTimeline({
  itinerary,
  tripId,
  onRevised,
}: {
  itinerary: TripItinerary;
  tripId?: string;
  onRevised?: (itinerary: TripItinerary) => void;
}) {
  return (
    <div className="space-y-8">
      {itinerary.days.map((day) => (
        <ItineraryDay
          key={day.day_number}
          day={day}
          tripId={tripId}
          itinerary={itinerary}
          onRevised={onRevised}
        />
      ))}
    </div>
  );
}
