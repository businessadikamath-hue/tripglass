import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { DashboardTripsClient } from "@/components/trips/DashboardTripsClient";
import { createClient } from "@/lib/supabase/server";
import type { TripRecord } from "@/types/trip";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const { data: trips } =
    supabase && user
      ? await supabase
          .from("trips")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
      : { data: [] };

  const typedTrips = (trips ?? []) as TripRecord[];
  const upcoming = typedTrips.filter((trip) => trip.start_date && trip.start_date >= new Date().toISOString().slice(0, 10)).length;
  const publicTrips = typedTrips.filter((trip) => trip.is_public).length;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            {user ? "Your trips" : "Trip dashboard"}
          </h1>
          <p className="mt-3 text-slate-300">
            {user
              ? "Search, reopen, share, or revise saved itineraries."
              : "Sign in to save and revisit your generated itineraries."}
          </p>
        </div>
        <Button href="/trips/new">
          <Plus className="h-4 w-4" />
          New Trip
        </Button>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Saved trips", typedTrips.length],
          ["Upcoming trips", upcoming],
          ["Public shared", publicTrips],
        ].map(([label, value]) => (
          <GlassCard key={label} className="p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          </GlassCard>
        ))}
      </div>
      <DashboardTripsClient trips={typedTrips} />
    </AppShell>
  );
}
