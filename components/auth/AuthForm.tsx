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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const isSignup = mode === "signup";

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isSupabaseConfigured() || !supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (isSignup && fullName.trim().length < 2) {
      setError("Enter your name so your account can be created.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    if (isSignup) {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent("/dashboard")}`,
          data: {
            full_name: fullName.trim(),
          },
        },
      });
      setLoading(false);

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (data.user && data.session) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          default_currency: "USD",
        });
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setMessage("Check your email to verify your account. The link will sign you in automatically.");
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.push(params.get("redirectedFrom") || "/dashboard");
    router.refresh();
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
            ? "Create your account once. Your verification email will sign you in automatically."
            : "Sign in with your email and password. This device stays signed in until you log out."}
        </p>
      </div>
      <form onSubmit={handleAuth} className="space-y-4">
        {isSignup ? (
          <Input
            label="Name"
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your name"
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
          placeholder="At least 8 characters"
        />
        {isSignup ? (
          <Input
            label="Confirm password"
            type="password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
          />
        ) : null}
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
        <Button
          type="submit"
          className="w-full"
          disabled={
            loading ||
            !email ||
            !password ||
            (isSignup && (!fullName.trim() || !confirmPassword))
          }
        >
          {loading
            ? isSignup
              ? "Creating..."
              : "Signing in..."
            : isSignup
              ? "Create account"
              : "Sign in"}
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
