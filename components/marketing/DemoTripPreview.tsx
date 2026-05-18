import { CalendarDays, MapPin, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";

const items = [
  ["09:30", "Meiji Shrine and Harajuku gardens", "Verified place"],
  ["12:15", "Neighborhood ramen lunch", "AI estimate"],
  ["14:00", "Design shops in Daikanyama", "AI suggestion"],
  ["18:30", "Shibuya skyline and dinner", "Verified place"],
];

export function DemoTripPreview() {
  return (
    <GlassCard id="demo" className="relative overflow-hidden p-5 sm:p-6" intensity="strong">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <Badge variant="glass">3-day Tokyo demo</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-white">Tokyo, balanced pace</h2>
          <p className="mt-2 text-sm text-slate-300">Food, design, hidden gems, photography</p>
        </div>
        <div className="hidden rounded-2xl border border-white/[0.12] bg-white/[0.10] p-3 text-cyan-100 sm:block">
          <CalendarDays className="h-5 w-5" />
        </div>
      </div>
      <div className="relative mt-6 grid gap-3">
        {items.map(([time, title, badge]) => (
          <div key={title} className="rounded-2xl border border-white/[0.12] bg-slate-950/[0.28] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-cyan-100">{time}</span>
              <Badge variant={badge === "Verified place" ? "success" : "warning"}>{badge}</Badge>
            </div>
            <p className="mt-2 font-medium text-white">{title}</p>
            <p className="mt-1 text-xs text-slate-400">Cost estimate, map pin, transit note, and why it fits.</p>
          </div>
        ))}
      </div>
      <div className="relative mt-4 grid grid-cols-[1fr_auto] gap-3">
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <MapPin className="h-4 w-4 text-cyan-100" />
            Map preview
          </div>
          <div className="h-28 rounded-2xl bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.45),transparent_18%),radial-gradient(circle_at_70%_55%,rgba(244,114,182,0.38),transparent_18%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.72))]" />
        </div>
        <div className="hidden rounded-2xl border border-white/[0.12] bg-white/[0.06] p-4 sm:grid sm:place-items-center">
          <Utensils className="h-6 w-6 text-amber-100" />
        </div>
      </div>
    </GlassCard>
  );
}
