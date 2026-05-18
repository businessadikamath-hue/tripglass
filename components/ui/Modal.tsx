"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-xl">
      <GlassCard className="w-full max-w-lg p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <Button variant="ghost" aria-label="Close modal" onClick={onClose} className="h-10 w-10 px-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {children}
      </GlassCard>
    </div>
  );
}
