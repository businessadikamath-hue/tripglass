import { CalendarDays, MapPin, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateRange } from "@/lib/utils/dates";
import type { TripRecord } from "@/types/trip";

export function TripCard({ trip }: { trip: TripRecord }) {
  return (
    <GlassCard className="group overflow-hidden p-5" intensity="subtle">
      <div className="mb-5 h-28 rounded-3xl bg-[radial-gradient(circle_at_30%_35%,rgba(56,189,248,0.42),transparent_22%),radial-gradient(circle_at_75%_60%,rgba(244,114,182,0.28),transparent_24%),linear-gradient(135deg,rgba(99,102,241,0.32),rgba(15,23,42,0.8))]" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{trip.title}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <MapPin className="h-4 w-4 text-cyan-100" />
            {trip.destination_text}
          </p>
        </div>
        {trip.is_public ? <Badge variant="info">Shared</Badge> : null}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-slate-300">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {formatDateRange(trip.start_date, trip.end_date)} · {trip.days_count} days
        </span>
        <span>{formatCurrency(trip.budget_amount, trip.currency)} budget</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(trip.interests ?? []).slice(0, 3).map((interest) => (
          <Badge key={interest} variant="glass">
            {interest}
          </Badge>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        <Button href={`/trips/${trip.id}`} className="flex-1" variant="secondary">
          Open
        </Button>
        <Button href={`/trips/${trip.id}?share=1`} variant="glass" aria-label="Share trip">
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
    </GlassCard>
  );
}
