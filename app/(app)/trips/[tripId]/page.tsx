import { AppShell } from "@/components/layout/AppShell";
import { TripDetailClient } from "@/components/trips/TripDetailClient";
import { createClient } from "@/lib/supabase/server";
import type { TripRecord } from "@/types/trip";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  let trip: TripRecord | null = null;

  if (supabase && !tripId.startsWith("guest-")) {
    const { data } = await supabase.from("trips").select("*").eq("id", tripId).single();
    trip = data as TripRecord | null;
  }

  return (
    <AppShell>
      <TripDetailClient tripId={tripId} initialTrip={trip} />
    </AppShell>
  );
}
