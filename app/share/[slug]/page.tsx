import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";
import { Logo } from "@/components/layout/Navbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { BudgetSummary } from "@/components/trips/BudgetSummary";
import { ItineraryTimeline } from "@/components/trips/ItineraryTimeline";
import { TripMap } from "@/components/trips/TripMap";
import { createClient } from "@/lib/supabase/server";
import type { TripRecord } from "@/types/trip";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = supabase
    ? await supabase
        .from("trips")
        .select("*")
        .eq("public_share_slug", slug)
        .eq("is_public", true)
        .single()
    : { data: null };
  const trip = data as TripRecord | null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <BackgroundOrbs />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <Button href="/trips/new" variant="secondary">Create your own trip</Button>
        </div>
        {!trip ? (
          <GlassCard className="p-8 text-center">
            <h1 className="text-3xl font-semibold text-white">Shared trip not found</h1>
            <p className="mt-3 text-slate-300">This link may be private or expired.</p>
          </GlassCard>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-6">
              <GlassCard className="p-6" intensity="strong">
                <Badge variant="info">Made with TripGlass</Badge>
                <h1 className="mt-4 text-4xl font-semibold text-white">{trip.itinerary_json.title}</h1>
                <p className="mt-3 text-slate-300">{trip.itinerary_json.summary}</p>
              </GlassCard>
              <ItineraryTimeline itinerary={trip.itinerary_json} />
            </div>
            <aside className="space-y-5 lg:sticky lg:top-6 lg:h-fit">
              <TripMap itinerary={trip.itinerary_json} />
              <BudgetSummary itinerary={trip.itinerary_json} />
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
