"use client";

import { useState } from "react";
import { CheckCircle2, Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

export function AccountComplete() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  async function createAccount() {
    setDone(true);
    window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
  }

  return (
    <GlassCard className="w-full max-w-md p-8 text-center" intensity="strong">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/[0.10]">
        {done ? (
          <CheckCircle2 className="h-7 w-7 text-emerald-100" />
        ) : (
          <Compass className="h-7 w-7 text-cyan-100" />
        )}
      </div>
      <h1 className="text-2xl font-semibold text-white">
        {done ? "Account created" : "Finish creating your account"}
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        {done
          ? "You are signed in. Your trips will be saved to your account."
          : "Your email is verified. Click below to open TripGlass and save your plans."}
      </p>
      <Button onClick={createAccount} disabled={done} className="mt-6 w-full">
        {done ? "Redirecting..." : "Create account"}
      </Button>
    </GlassCard>
  );
}
