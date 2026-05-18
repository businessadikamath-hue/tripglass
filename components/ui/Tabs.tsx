"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export function Tabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div>
      <div className="mb-4 grid grid-cols-4 rounded-2xl border border-white/[0.12] bg-white/[0.08] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "rounded-xl px-3 py-2 text-xs font-semibold text-slate-300",
              active === tab.id ? "bg-white/[0.16] text-white shadow-lg" : "hover:bg-white/[0.08]",
            )}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.find((tab) => tab.id === active)?.content}
    </div>
  );
}
