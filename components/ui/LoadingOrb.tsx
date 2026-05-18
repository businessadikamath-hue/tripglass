export function LoadingOrb({ label = "Polishing your itinerary" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 text-center">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-cyan-400/40 blur-2xl animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-[conic-gradient(from_180deg,#6366F1,#06B6D4,#F472B6,#6366F1)] shadow-[0_0_70px_rgba(6,182,212,0.45)] animate-spin" />
        <div className="absolute inset-6 rounded-full bg-slate-950/80 backdrop-blur-xl" />
      </div>
      <p className="text-sm font-medium text-slate-200">{label}</p>
    </div>
  );
}
