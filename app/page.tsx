import { redirect } from "next/navigation";
import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";
import { MarketingNavbar } from "@/components/layout/Navbar";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Hero } from "@/components/marketing/Hero";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) redirect("/dashboard");

  return (
    <>
      <BackgroundOrbs />
      <MarketingNavbar isSignedIn={false} />
      <main>
        <Hero />
        <FeatureGrid />
        <section id="how" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Tell TripGlass your vibe", "Destination, budget, interests, constraints, and pace."],
              ["Review your AI plan", "Day-by-day cards with source labels, estimates, maps, and weather."],
              ["Save, share, and revise", "Keep trips in Supabase, publish read-only links, or ask for changes."],
            ].map(([title, text], index) => (
              <GlassCard key={title} className="p-7">
                <span className="text-sm font-semibold text-cyan-100">0{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
              </GlassCard>
            ))}
          </div>
        </section>
        <section className="mx-auto max-w-5xl px-6 pb-24 lg:px-8">
          <GlassCard className="p-8 text-center sm:p-12" intensity="strong">
            <h2 className="text-3xl font-semibold text-white sm:text-5xl">
              Your next trip starts with one prompt.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-300">
              Build a complete itinerary with live AI planning, source-aware suggestions, maps, weather, and sharing.
            </p>
            <Button href="/trips/new" className="mt-8 rounded-full px-8">
              Create My Trip
            </Button>
          </GlassCard>
        </section>
      </main>
    </>
  );
}
