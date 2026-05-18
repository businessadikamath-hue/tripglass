import { CloudSun } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { TripItinerary } from "@/types/trip";

export function WeatherStrip({ itinerary }: { itinerary: TripItinerary }) {
  return (
    <GlassCard className="p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">Weather</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {itinerary.days.map((day) => (
          <div key={day.day_number} className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-3">
            <div className="flex items-center gap-3">
              <CloudSun className="h-5 w-5 text-cyan-100" />
              <div>
                <p className="text-sm font-medium text-white">Day {day.day_number}</p>
                <p className="text-xs text-slate-400">{day.date ?? "Flexible date"}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {day.weather.available
                ? `${day.weather.condition ?? "Forecast"} · ${day.weather.low_temp_c ?? "?"}-${day.weather.high_temp_c ?? "?"} C`
                : "Forecast unavailable"}
            </p>
            {day.weather.packing_tip ? <p className="mt-1 text-xs text-slate-400">{day.weather.packing_tip}</p> : null}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
