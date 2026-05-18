"use client";

import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import type { TripItinerary } from "@/types/trip";

const suggestions = [
  "Make this cheaper",
  "Add more museums",
  "Make Day 2 less packed",
  "Add rainy-day alternatives",
  "Make it more romantic",
  "Avoid long walks",
];

export function RevisionPanel({
  tripId,
  itinerary,
  onRevised,
}: {
  tripId: string;
  itinerary: TripItinerary;
  onRevised?: (itinerary: TripItinerary) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  async function revise() {
    if (!instruction.trim()) return;
    setLoading(true);
    setError("");
    const response = await fetch(`/api/trips/${tripId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction, current_itinerary_json: itinerary }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to revise this itinerary.");
      return;
    }

    onRevised?.(payload.itinerary);
    toast.push("Itinerary updated.");
    setInstruction("");
  }

  return (
    <GlassCard className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <WandSparkles className="h-5 w-5 text-cyan-100" />
        <h2 className="text-lg font-semibold text-white">Revise with AI</h2>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setInstruction(suggestion)}
            className="rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.12]"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <Textarea
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Replace expensive restaurants and make Day 3 slower..."
      />
      {error ? <p className="mt-3 text-sm text-rose-100">{error}</p> : null}
      <Button onClick={revise} disabled={loading || !instruction.trim()} className="mt-4 w-full">
        {loading ? "Revising..." : "Update itinerary"}
      </Button>
    </GlassCard>
  );
}
