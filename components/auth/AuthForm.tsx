"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!isSupabaseConfigured() || !supabase) {
      setError("Supabase is not configured yet. Add your Supabase URL and anon key to .env.local.");
      return;
    }

    setLoading(true);
    const redirectTo = `${window.location.origin}/callback`;
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo, data: { full_name: fullName } },
          });
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    router.push(params.get("redirectedFrom") || "/dashboard");
    router.refresh();
  }

  async function magicLink() {
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }
    setLoading(true);
    const { error: magicError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });
    setLoading(false);
    setError(magicError ? magicError.message : "Check your email for the magic link.");
  }

  return (
    <GlassCard className="w-full max-w-md p-8" intensity="strong">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/[0.10]">
          <Compass className="h-6 w-6 text-cyan-100" />
        </div>
        <h1 className="text-2xl font-semibold text-white">
          {mode === "login" ? "Welcome back" : "Create your TripGlass account"}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Save trips, revise itineraries, and publish read-only share links.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === "signup" ? (
          <Input
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Avery Stone"
          />
        ) : null}
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <Input
          label="Password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        {error ? <p className="rounded-2xl border border-rose-300/25 bg-rose-500/[0.12] p-3 text-sm text-rose-100">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
        </Button>
        <Button type="button" variant="secondary" className="w-full" onClick={magicLink} disabled={!email || loading}>
          Send magic link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <a className="font-medium text-cyan-100 hover:text-white" href={mode === "login" ? "/signup" : "/login"}>
          {mode === "login" ? "Create an account" : "Sign in"}
        </a>
      </p>
    </GlassCard>
  );
}
