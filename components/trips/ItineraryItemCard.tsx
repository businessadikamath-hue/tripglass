"use client";

import { useState } from "react";
import { Coffee, Hotel, Landmark, MapPin, TreePalm, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { OperationProgress } from "@/components/ui/OperationProgress";
import { Textarea } from "@/components/ui/Textarea";
import { formatCurrency } from "@/lib/utils/currency";
import type { ItineraryItem, TripItinerary } from "@/types/trip";

const icons = {
  restaurant: Utensils,
  cafe: Coffee,
  museum: Landmark,
  nature: TreePalm,
  attraction: Landmark,
  shopping: MapPin,
  neighborhood: MapPin,
  transport: MapPin,
  break: Coffee,
  hotel: Hotel,
  nightlife: MapPin,
  other: MapPin,
};

const replacementSteps = [
  "Understanding this stop",
  "Finding a better fit",
  "Reworking timing",
  "Updating the itinerary",
];

export function ItineraryItemCard({
  item,
  dayNumber,
  itemIndex,
  tripId,
  itinerary,
  onRevised,
}: {
  item: ItineraryItem;
  dayNumber?: number;
  itemIndex?: number;
  tripId?: string;
  itinerary?: TripItinerary;
  onRevised?: (itinerary: TripItinerary) => void;
}) {
  const Icon = icons[item.category] ?? MapPin;
  const verified = item.place.source === "google_places";
  const liveOffer = item.place.source === "amadeus";
  const [isReplacing, setIsReplacing] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function replacePlace() {
    if (!tripId || !itinerary || !prompt.trim()) return;
    setLoading(true);
    setError("");

    const response = await fetch(`/api/trips/${tripId}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction: [
          `Replace or revise Day ${dayNumber ?? "?"} item ${(itemIndex ?? 0) + 1}: "${item.title}".`,
          `User request: ${prompt}.`,
          "Preserve the rest of the itinerary unless changing nearby timing/transit is necessary.",
          "Keep clear start_time and end_time values and update costs/source labels.",
        ].join(" "),
        current_itinerary_json: itinerary,
      }),
    });
    const payload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error?.message ?? "Unable to replace this stop.");
      return;
    }

    onRevised?.(payload.itinerary);
    setPrompt("");
    setIsReplacing(false);
  }

  return (
    <GlassCard className="p-4" intensity="subtle">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="w-24 shrink-0 text-sm font-semibold text-cyan-100">
          {item.start_time} - {item.end_time}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/[0.12] bg-white/[0.10]">
              <Icon className="h-4 w-4 text-cyan-100" />
            </span>
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <Badge variant={verified || liveOffer ? "success" : item.place.source === "ai_estimate" ? "warning" : "info"}>
              {verified ? "Verified place" : liveOffer ? "Live offer" : item.place.source === "ai_estimate" ? "AI estimate" : "User input"}
            </Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{item.description}</p>
          {item.place.name ? (
            <p className="mt-3 text-sm text-slate-300">
              <span className="font-medium text-slate-100">{item.place.name}</span>
              {item.place.address ? ` · ${item.place.address}` : ""}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2 text-sm text-slate-400">
            <p>{formatCurrency(item.estimated_cost.amount, item.estimated_cost.currency)} · {item.estimated_cost.note}</p>
            <p>{item.why_it_fits}</p>
            {item.transit_note ? <p>{item.transit_note}</p> : null}
            {item.accessibility_note ? <p>{item.accessibility_note}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.place.google_maps_url ? (
              <Button href={item.place.google_maps_url} variant="secondary" className="min-h-10 px-4" aria-label={`Open ${item.title} in Google Maps`}>
                View on map
              </Button>
            ) : null}
            {tripId && itinerary ? (
              <Button
                variant="glass"
                className="min-h-10 px-4"
                onClick={() => setIsReplacing((value) => !value)}
              >
                Replace place
              </Button>
            ) : null}
          </div>
          {isReplacing ? (
            <div className="mt-4 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
              <p className="mb-2 text-sm font-semibold text-white">
                What would you like to change about this?
              </p>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Make this cheaper, swap it for a quieter museum, or choose something closer to lunch..."
                className="min-h-24"
              />
              {error ? <p className="mt-2 text-sm text-rose-100">{error}</p> : null}
              {loading ? (
                <OperationProgress steps={replacementSteps} estimatedSeconds={24} className="mt-3" />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  onClick={replacePlace}
                  disabled={loading || !prompt.trim()}
                  loading={loading}
                  className="min-h-10 px-4"
                >
                  {loading ? "Replacing..." : "Replace with AI"}
                </Button>
                <Button
                  variant="ghost"
                  className="min-h-10 px-4"
                  onClick={() => setIsReplacing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </GlassCard>
  );
}
