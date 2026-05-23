"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import {
  applyTheme,
  getStoredTheme,
  type ThemePreference,
} from "@/components/theme/ThemeProvider";

export function SettingsForm({
  profile,
  integrations,
}: {
  profile: { full_name?: string | null; home_city?: string | null; default_currency?: string | null } | null;
  integrations: Record<string, boolean>;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [homeCity, setHomeCity] = useState(profile?.home_city ?? "");
  const [currency, setCurrency] = useState(profile?.default_currency ?? "USD");
  const [theme, setTheme] = useState<ThemePreference>(() => getStoredTheme());
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  function changeTheme(value: string) {
    const nextTheme: ThemePreference =
      value === "light" || value === "midnight" ? value : "default";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  async function save() {
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sign in to save profile settings.");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      home_city: homeCity,
      default_currency: currency,
    });
    setMessage(error ? error.message : "Settings saved.");
  }

  async function signOut() {
    const supabase = createClient();
    if (!supabase) {
      setMessage("Supabase is not configured yet.");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") return;
    setDeleteLoading(true);
    setDeleteError("");

    const response = await fetch("/api/account/delete", {
      method: "POST",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setDeleteLoading(false);
      setDeleteError(payload?.error?.message ?? "Could not delete your account.");
      return;
    }

    const supabase = createClient();
    await supabase?.auth.signOut();
    window.localStorage.clear();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <GlassCard className="p-6">
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Input label="Profile name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input label="Home city" value={homeCity} onChange={(event) => setHomeCity(event.target.value)} />
          <Select
            label="Default currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            options={["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((value) => ({ value, label: value }))}
          />
          <Select
            label="Theme preference"
            value={theme}
            onChange={(event) => changeTheme(event.target.value)}
            options={[
              { value: "default", label: "Default" },
              { value: "light", label: "Light" },
              { value: "midnight", label: "Midnight" },
            ]}
          />
        </div>
        {message ? <p className="mt-4 text-sm text-cyan-100">{message}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={save}>Save settings</Button>
          <Button onClick={signOut} variant="secondary">
            Log out
          </Button>
        </div>
        <div className="mt-8 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4">
          <p className="font-medium text-rose-100">Delete account</p>
          <p className="mt-1 text-sm text-rose-100/80">
            Permanently delete your login, profile, saved trips, revisions, and saved places.
          </p>
          <Button
            variant="danger"
            className="mt-4"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteError("");
            }}
          >
            Delete account
          </Button>
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white">API status</h2>
        <div className="mt-5 space-y-3">
          {Object.entries(integrations).map(([key, ok]) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-3">
              <span className="text-sm capitalize text-slate-300">{key.replace(/([A-Z])/g, " $1")}</span>
              <Badge variant={ok ? "success" : "warning"}>{ok ? "Configured" : "Missing"}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
      <Modal
        open={deleteOpen}
        title="Delete account"
        onClose={() => {
          if (!deleteLoading) setDeleteOpen(false);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            This permanently deletes your TripGlass account and saved trip data. This cannot be undone.
          </p>
          <Input
            label='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="DELETE"
          />
          {deleteError ? (
            <p className="rounded-2xl border border-rose-300/25 bg-rose-500/[0.12] p-3 text-sm text-rose-100">
              {deleteError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={deleteLoading || deleteConfirm !== "DELETE"}
              onClick={deleteAccount}
            >
              {deleteLoading ? "Deleting..." : "Permanently delete account"}
            </Button>
            <Button
              variant="secondary"
              disabled={deleteLoading}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
