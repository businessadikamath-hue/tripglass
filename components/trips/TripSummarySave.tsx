"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/currency";
import type { TripInput, TripItinerary } from "@/types/trip";

export function TripSummarySave({
  tripId,
  itinerary,
  inputSnapshot,
}: {
  tripId: string;
  itinerary: TripItinerary;
  inputSnapshot?: TripInput;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const isGuestTrip = tripId.startsWith("guest-");

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      setIsSignedIn(Boolean(user));
    }

    checkUser();
  }, [supabase]);

  async function saveTrip() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/trips/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: itinerary.title,
        destination_text: itinerary.destination,
        input_snapshot: inputSnapshot ?? {},
        itinerary_json: itinerary,
      }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error?.message ?? "Unable to save this trip.");
      return;
    }

    window.localStorage.removeItem(`tripglass:${tripId}`);
    router.push(`/trips/${payload.tripId}`);
    router.refresh();
  }

  return (
    <GlassCard className="p-6" intensity="strong">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="info">Trip summary</Badge>
          <h2 className="mt-3 text-2xl font-semibold text-white">{itinerary.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            {itinerary.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="glass">{itinerary.days_count} days</Badge>
            <Badge variant="glass">
              {formatCurrency(itinerary.estimated_total_cost, itinerary.currency)}
            </Badge>
            {itinerary.neighborhoods.slice(0, 3).map((neighborhood) => (
              <Badge key={neighborhood} variant="glass">
                {neighborhood}
              </Badge>
            ))}
          </div>
        </div>
        <div className="w-full shrink-0 lg:w-64">
          {!isGuestTrip ? (
            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/[0.12] p-4 text-sm text-emerald-100">
              <CheckCircle2 className="mb-2 h-5 w-5" />
              This trip is saved to your account.
            </div>
          ) : isSignedIn ? (
            <Button onClick={saveTrip} disabled={loading} className="w-full">
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save entire trip"}
            </Button>
          ) : (
            <div className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.12] p-4">
              <p className="text-sm font-semibold text-amber-100">
                Please sign in to save trips
              </p>
              <Button href="/login" variant="secondary" className="mt-3 w-full">
                Sign in
              </Button>
            </div>
          )}
          {message ? <p className="mt-3 text-sm text-rose-100">{message}</p> : null}
        </div>
      </div>
    </GlassCard>
  );
}
