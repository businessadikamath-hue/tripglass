"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const isSignup = mode === "signup";

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isSupabaseConfigured() || !supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    const next = isSignup
      ? "/signup/complete"
      : params.get("redirectedFrom") || "/dashboard";
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: isSignup,
        emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);

    if (magicError) {
      setError(magicError.message);
      return;
    }

    setMessage(
      isSignup
        ? "Check your email for your secure account creation link."
        : "Check your email for your secure sign-in link.",
    );
  }

  return (
    <GlassCard className="w-full max-w-md p-8" intensity="strong">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/[0.10]">
          <Compass className="h-6 w-6 text-cyan-100" />
        </div>
        <h1 className="text-2xl font-semibold text-white">
          {isSignup ? "Create your TripGlass account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          {isSignup
            ? "Enter your email and we will send a secure account creation link."
            : "Enter your email and we will send a secure sign-in link."}
        </p>
      </div>
      <form onSubmit={sendMagicLink} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        {error ? (
          <p className="rounded-2xl border border-rose-300/25 bg-rose-500/[0.12] p-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="rounded-2xl border border-emerald-300/25 bg-emerald-500/[0.12] p-3 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={loading || !email}>
          {loading
            ? "Sending..."
            : isSignup
              ? "Send account link"
              : "Send sign-in link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {isSignup ? "Already have an account? " : "New here? "}
        <a
          className="font-medium text-cyan-100 hover:text-white"
          href={isSignup ? "/login" : "/signup"}
        >
          {isSignup ? "Sign in" : "Create an account"}
        </a>
      </p>
    </GlassCard>
  );
}
