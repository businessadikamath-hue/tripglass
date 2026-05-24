"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TripCard } from "@/components/trips/TripCard";
import type { TripRecord } from "@/types/trip";

type Filter = "all" | "upcoming" | "past" | "shared";

export function DashboardTripsClient({ trips }: { trips: TripRecord[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const today = new Date().toISOString().slice(0, 10);

  const filteredTrips = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return trips.filter((trip) => {
      const matchesQuery =
        !normalized ||
        [
          trip.title,
          trip.destination_text,
          trip.travel_style,
          trip.pace,
          ...(trip.interests ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        filter === "all" ||
        (filter === "upcoming" && Boolean(trip.start_date && trip.start_date >= today)) ||
        (filter === "past" && Boolean(trip.end_date && trip.end_date < today)) ||
        (filter === "shared" && Boolean(trip.is_public));
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, today, trips]);

  return (
    <>
      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by destination, title, pace, style, or interest"
            aria-label="Search saved trips"
            className="pr-11"
          />
          <Search className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-slate-500" />
        </div>
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-1">
          {[
            ["all", "All"],
            ["upcoming", "Upcoming"],
            ["past", "Past"],
            ["shared", "Shared"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as Filter)}
              className={`min-h-10 rounded-xl px-4 text-sm font-medium transition ${
                filter === value
                  ? "bg-cyan-300/15 text-cyan-50 shadow-[0_0_18px_rgba(6,182,212,0.18)]"
                  : "text-slate-300 hover:bg-white/[0.08]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {filteredTrips.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={trips.length ? "No trips match that search." : "No trips yet. Build your first itinerary."}
          description={
            trips.length
              ? "Try a different destination, interest, or filter."
              : "Start with a destination and TripGlass will produce a polished plan with AI suggestions, maps, costs, and weather context."
          }
          action={<Button href="/trips/new">Plan a Trip</Button>}
        />
      )}
    </>
  );
}
