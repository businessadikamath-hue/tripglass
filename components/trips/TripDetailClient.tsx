"use client";

import { useState } from "react";
import { Pencil, Printer } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tabs } from "@/components/ui/Tabs";
import { ToastProvider } from "@/components/ui/Toast";
import { BudgetSummary } from "@/components/trips/BudgetSummary";
import { ItineraryTimeline } from "@/components/trips/ItineraryTimeline";
import { RevisionPanel } from "@/components/trips/RevisionPanel";
import { ShareButton } from "@/components/trips/ShareButton";
import { TripMap } from "@/components/trips/TripMap";
import { TripSummarySave } from "@/components/trips/TripSummarySave";
import { WeatherStrip } from "@/components/trips/WeatherStrip";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDateRange } from "@/lib/utils/dates";
import type { TripItinerary, TripRecord } from "@/types/trip";

type InitialTrip = Partial<TripRecord> & {
  id: string;
  title: string;
  destination_text: string;
  itinerary_json: TripItinerary;
};

export function TripDetailClient({
  tripId,
  initialTrip,
}: {
  tripId: string;
  initialTrip: InitialTrip | null;
}) {
  const [trip, setTrip] = useState<InitialTrip | null>(() => {
    if (initialTrip) return initialTrip;
    if (!initialTrip && tripId.startsWith("guest-") && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(`tripglass:${tripId}`);
      if (stored) return JSON.parse(stored) as InitialTrip;
    }
    return null;
  });

  if (!trip) {
    return (
      <GlassCard className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-white">Trip not found</h1>
        <p className="mt-2 text-slate-300">This itinerary may be private, deleted, or only stored on another browser.</p>
        <Button href="/trips/new" className="mt-6">Plan a Trip</Button>
      </GlassCard>
    );
  }

  const itinerary = trip.itinerary_json;

  function updateItinerary(updated: TripItinerary) {
    const next = { ...trip!, itinerary_json: updated, title: updated.title };
    setTrip(next);
    if (tripId.startsWith("guest-")) {
      window.localStorage.setItem(`tripglass:${tripId}`, JSON.stringify(next));
    }
  }

  const overview = (
    <div className="space-y-6">
      <GlassCard className="p-6" intensity="strong">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="info">Generated itinerary</Badge>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">{itinerary.title}</h1>
            <p className="mt-3 max-w-3xl text-slate-300">{itinerary.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ShareButton tripId={tripId} initialSlug={trip.public_share_slug} />
            <Button href={`/trips/${tripId}/edit`} variant="secondary">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button variant="glass" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
            <p className="text-xs text-slate-500">Dates</p>
            <p className="mt-1 text-sm font-medium text-white">{formatDateRange(trip.start_date, trip.end_date)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
            <p className="text-xs text-slate-500">Estimated total</p>
            <p className="mt-1 text-sm font-medium text-white">{formatCurrency(itinerary.estimated_total_cost, itinerary.currency)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
            <p className="text-xs text-slate-500">Best for</p>
            <p className="mt-1 text-sm font-medium text-white">{itinerary.best_for.join(", ")}</p>
          </div>
        </div>
        {itinerary.warnings.length ? (
          <div className="mt-5 rounded-2xl border border-amber-300/25 bg-amber-400/[0.12] p-4 text-sm text-amber-100">
            {itinerary.warnings.join(" ")}
          </div>
        ) : null}
      </GlassCard>
      <ItineraryTimeline itinerary={itinerary} tripId={tripId} onRevised={updateItinerary} />
      <TripSummarySave
        tripId={tripId}
        itinerary={itinerary}
        inputSnapshot={trip.input_snapshot}
      />
    </div>
  );

  return (
    <ToastProvider>
      <div className="lg:hidden">
        <Tabs
          tabs={[
            { id: "itinerary", label: "Itinerary", content: overview },
            {
              id: "map",
              label: "Map",
              content: (
                <TripMap
                  itinerary={itinerary}
                  destinationLat={trip.destination_lat}
                  destinationLng={trip.destination_lng}
                  destinationText={trip.destination_text}
                />
              ),
            },
            {
              id: "budget",
              label: "Budget",
              content: (
                <BudgetSummary
                  itinerary={itinerary}
                  tripId={tripId}
                  onRevised={updateItinerary}
                />
              ),
            },
            {
              id: "revise",
              label: "Revise",
              content: <RevisionPanel tripId={tripId} itinerary={itinerary} onRevised={updateItinerary} />,
            },
          ]}
        />
      </div>
      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>{overview}</div>
        <aside className="sticky top-24 h-fit space-y-5">
          <TripMap
            itinerary={itinerary}
            destinationLat={trip.destination_lat}
            destinationLng={trip.destination_lng}
            destinationText={trip.destination_text}
          />
          <BudgetSummary itinerary={itinerary} tripId={tripId} onRevised={updateItinerary} />
          <WeatherStrip itinerary={itinerary} />
          <RevisionPanel tripId={tripId} itinerary={itinerary} onRevised={updateItinerary} />
        </aside>
      </div>
    </ToastProvider>
  );
}
