export function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_32%),linear-gradient(135deg,#07111F_0%,#0B1020_48%,#111827_100%)]">
      <div className="noise absolute inset-0 opacity-50" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl animate-[drift_14s_ease-in-out_infinite]" />
      <div className="absolute right-0 top-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-[drift_18s_ease-in-out_infinite]" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-pink-400/[0.14] blur-3xl animate-[drift_20s_ease-in-out_infinite]" />
      <div className="absolute bottom-24 right-1/4 h-56 w-56 rounded-full bg-emerald-400/[0.12] blur-3xl animate-[drift_16s_ease-in-out_infinite]" />
    </div>
  );
}
