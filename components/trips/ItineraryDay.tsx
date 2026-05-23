import { ItineraryItemCard } from "@/components/trips/ItineraryItemCard";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import type { ItineraryDay as ItineraryDayType, TripItinerary } from "@/types/trip";

export function ItineraryDay({
  day,
  tripId,
  itinerary,
  onRevised,
}: {
  day: ItineraryDayType;
  tripId?: string;
  itinerary?: TripItinerary;
  onRevised?: (itinerary: TripItinerary) => void;
}) {
  return (
    <section className="space-y-4">
      <GlassCard className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="info">Day {day.day_number}</Badge>
            <h2 className="mt-3 text-2xl font-semibold text-white">{day.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{day.summary}</p>
          </div>
          <span className="text-sm text-slate-400">{day.date ?? "Flexible"}</span>
        </div>
      </GlassCard>
      {day.items.map((item, index) => (
        <ItineraryItemCard
          key={`${day.day_number}-${index}-${item.title}`}
          item={item}
          dayNumber={day.day_number}
          itemIndex={index}
          tripId={tripId}
          itinerary={itinerary}
          onRevised={onRevised}
        />
      ))}
      {day.backup_options.length ? (
        <GlassCard className="p-4" intensity="subtle">
          <p className="text-sm font-semibold text-white">Backup options</p>
          <div className="mt-3 grid gap-2">
            {day.backup_options.map((backup) => (
              <p key={backup.title} className="text-sm text-slate-300">
                <span className="font-medium text-slate-100">{backup.title}:</span> {backup.description}
              </p>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </section>
  );
}
