import { ItineraryDay } from "@/components/trips/ItineraryDay";
import type { TripItinerary } from "@/types/trip";

export function ItineraryTimeline({ itinerary }: { itinerary: TripItinerary }) {
  return (
    <div className="space-y-8">
      {itinerary.days.map((day) => (
        <ItineraryDay key={day.day_number} day={day} />
      ))}
    </div>
  );
}
