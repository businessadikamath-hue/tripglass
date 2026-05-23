"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { ArrowLeft, ArrowRight, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { GenerationProgress } from "@/components/trips/GenerationProgress";
import { getDaysCount } from "@/lib/utils/dates";
import {
  tripInputSchema,
  type TripInputFormValues,
  type TripInputSchema,
} from "@/lib/validation/tripInput";
import type { NormalizedPlace } from "@/types/places";

const steps = ["Destination", "Dates & Budget", "Style", "Interests", "Constraints", "Review"];
const interestOptions = [
  "Food",
  "Museums",
  "History",
  "Nature",
  "Shopping",
  "Architecture",
  "Nightlife",
  "Hidden gems",
  "Photography",
  "Beaches",
  "Hiking",
  "Cafes",
  "Local neighborhoods",
  "Theme parks",
  "Art",
  "Music",
  "Sports",
  "Luxury",
  "Budget-friendly",
  "Family-friendly",
];

const splitList = (value?: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function TripWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<NormalizedPlace[]>([]);
  const [placesWarning, setPlacesWarning] = useState("");

  const form = useForm<TripInputFormValues, unknown, TripInputSchema>({
    resolver: zodResolver(tripInputSchema),
    defaultValues: {
      destination_text: "",
      destination_place_id: null,
      destination_lat: null,
      destination_lng: null,
      starting_city: "",
      start_date: "",
      end_date: "",
      days_count: 3,
      budget_amount: null,
      currency: "USD",
      travelers: 2,
      pace: "balanced",
      travel_style: "Couple",
      start_time_preference: "Normal",
      walking_tolerance: "Medium",
      interests: ["Food", "Hidden gems", "Local neighborhoods"],
      food_preferences: [],
      accessibility_needs: [],
      must_see: [],
      avoid: [],
      notes: "",
    },
  });

  const values = useWatch({ control: form.control }) as TripInputFormValues;
  const destination = useWatch({ control: form.control, name: "destination_text" });
  const startDate = useWatch({ control: form.control, name: "start_date" });
  const endDate = useWatch({ control: form.control, name: "end_date" });
  const watchedInterests = useWatch({ control: form.control, name: "interests" });
  const interests = Array.isArray(watchedInterests) ? watchedInterests : [];

  useEffect(() => {
    if (startDate && endDate) {
      form.setValue("days_count", getDaysCount(startDate, endDate));
    }
  }, [endDate, form, startDate]);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (!destination || destination.length < 2 || form.getValues("destination_place_id")) return;
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(destination)}`);
      const payload = await response.json();
      if (!response.ok) {
        setPlacesWarning(payload.error?.message ?? "Destination search is temporarily unavailable. You can still enter a destination manually.");
        setSuggestions([]);
        return;
      }
      setPlacesWarning("");
      setSuggestions(payload.places ?? []);
    }, 350);
    return () => window.clearTimeout(handle);
  }, [destination, form]);

  function selectPlace(place: NormalizedPlace) {
    form.setValue("destination_text", place.name);
    form.setValue("destination_place_id", place.place_id);
    form.setValue("destination_lat", place.lat);
    form.setValue("destination_lng", place.lng);
    setSuggestions([]);
  }

  function toggleInterest(interest: string) {
    const raw = form.getValues("interests");
    const current = Array.isArray(raw) ? raw : [];
    form.setValue(
      "interests",
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  async function submit() {
    setGenerating(true);
    setError("");
    const currentValues = form.getValues();
    if (
      currentValues.destination_text &&
      (currentValues.destination_lat === null ||
        currentValues.destination_lat === undefined ||
        currentValues.destination_lng === null ||
        currentValues.destination_lng === undefined)
    ) {
      const response = await fetch(
        `/api/places/search?q=${encodeURIComponent(currentValues.destination_text)}`,
      ).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;
      const firstPlace = payload?.places?.[0];

      if (firstPlace) {
        form.setValue("destination_text", firstPlace.name);
        form.setValue("destination_place_id", firstPlace.place_id);
        form.setValue("destination_lat", firstPlace.lat);
        form.setValue("destination_lng", firstPlace.lng);
      }
    }

    const response = await fetch("/api/trips/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.getValues()),
    });
    const payload = await response.json();
    setGenerating(false);

    if (!response.ok) {
      setError(payload.error?.message ?? "Trip generation failed. Try again.");
      return;
    }

    const tripId = payload.tripId ?? payload.guestTripId ?? "guest-local";
    if (!payload.tripId) {
      window.localStorage.setItem(
        `tripglass:${tripId}`,
        JSON.stringify({
          id: tripId,
          title: payload.itinerary.title,
          destination_text: payload.itinerary.destination,
          input_snapshot: form.getValues(),
          itinerary_json: payload.itinerary,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      );
    }
    router.push(`/trips/${tripId}`);
  }

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  if (generating) return <GenerationProgress />;

  return (
    <GlassCard className="mx-auto max-w-5xl p-5 sm:p-8" intensity="strong">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm text-slate-300">
          <span>{steps[step]}</span>
          <span>{step + 1} of {steps.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.10]">
          <div className="h-full rounded-full bg-[linear-gradient(135deg,#6366F1,#8B5CF6,#06B6D4)]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={form.handleSubmit(submit)} className="space-y-8">
        {step === 0 ? (
          <div className="grid gap-5">
            <div className="relative">
              <Input
                label="Destination"
                placeholder="Where are you going? Tokyo, Rome, Banff, New York..."
                {...form.register("destination_text")}
                error={form.formState.errors.destination_text?.message}
              />
              <Search className="pointer-events-none absolute right-4 top-10 h-4 w-4 text-slate-500" />
              {suggestions.length ? (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/[0.15] bg-slate-950/95 p-2 shadow-2xl backdrop-blur-2xl">
                  {suggestions.slice(0, 5).map((place) => (
                    <button
                      type="button"
                      key={place.place_id}
                      onClick={() => selectPlace(place)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.10]"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" />
                      <span>
                        <span className="block text-sm font-medium text-white">{place.name}</span>
                        <span className="block text-xs text-slate-400">{place.address}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {placesWarning ? (
              <p className="rounded-2xl border border-amber-300/25 bg-amber-400/[0.12] p-3 text-sm text-amber-100">
                {placesWarning}
              </p>
            ) : null}
            <Input label="Starting city (optional)" placeholder="San Francisco" {...form.register("starting_city")} />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Start date" type="date" {...form.register("start_date")} />
            <Input label="End date" type="date" {...form.register("end_date")} error={form.formState.errors.end_date?.message} />
            <Input label="Duration in days" type="number" min={1} max={21} {...form.register("days_count")} error={form.formState.errors.days_count?.message} />
            <Input label="Budget amount" type="number" min={0} placeholder="2500" {...form.register("budget_amount", { valueAsNumber: true })} />
            <Select label="Currency" {...form.register("currency")} options={["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((value) => ({ value, label: value }))} />
            <Input label="Travelers" type="number" min={1} {...form.register("travelers")} />
            <div className="sm:col-span-2 flex flex-wrap gap-2">
              {["Shoestring", "Balanced", "Comfort", "Luxury"].map((label) => (
                <Badge key={label} variant="glass">{label}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Pace" {...form.register("pace")} options={[
              { label: "Relaxed", value: "relaxed" },
              { label: "Balanced", value: "balanced" },
              { label: "Packed", value: "packed" },
            ]} />
            <Select label="Trip type" {...form.register("travel_style")} options={["Solo", "Couple", "Family", "Friends", "Business"].map((value) => ({ value, label: value }))} />
            <Select label="Start time preference" {...form.register("start_time_preference")} options={["Early", "Normal", "Late"].map((value) => ({ value, label: value }))} />
            <Select label="Daily walking tolerance" {...form.register("walking_tolerance")} options={["Low", "Medium", "High"].map((value) => ({ value, label: value }))} />
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <p className="mb-4 text-sm text-slate-300">Choose the interests that should shape the trip.</p>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    interests.includes(interest)
                      ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-50"
                      : "border-white/[0.12] bg-white/[0.06] text-slate-300 hover:bg-white/[0.12]"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Dietary preferences" placeholder="Vegetarian, halal, gluten-free" onChange={(event) => form.setValue("food_preferences", splitList(event.target.value))} />
            <Input label="Accessibility needs" placeholder="Step-free routes, avoid long hikes" onChange={(event) => form.setValue("accessibility_needs", splitList(event.target.value))} />
            <Input label="Must-see places" placeholder="Louvre, Central Park" onChange={(event) => form.setValue("must_see", splitList(event.target.value))} />
            <Input label="Places to avoid" placeholder="No expensive fine dining" onChange={(event) => form.setValue("avoid", splitList(event.target.value))} />
            <Textarea className="sm:col-span-2" label="Notes" placeholder="Traveling with grandparents, want a slow first morning..." {...form.register("notes")} />
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-4">
            <h2 className="text-2xl font-semibold text-white">Review your trip</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Destination", values.destination_text],
                ["Dates", values.start_date && values.end_date ? `${values.start_date} to ${values.end_date}` : `${values.days_count} flexible days`],
                ["Budget", `${values.currency} ${values.budget_amount ?? "Flexible"}`],
                ["Travelers", `${values.travelers}`],
                ["Pace", values.pace],
                ["Interests", interests.join(", ")],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-medium text-white">{value}</p>
                </div>
              ))}
            </div>
            {error ? (
              <div className="rounded-2xl border border-rose-300/25 bg-rose-500/[0.12] p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {step < steps.length - 1 ? (
            <Button type="button" onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit">Generate My Trip</Button>
          )}
        </div>
      </form>
    </GlassCard>
  );
}
