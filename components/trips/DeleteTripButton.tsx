"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function DeleteTripButton({
  tripId,
  tripTitle,
  variant = "glass",
  compact = false,
}: {
  tripId: string;
  tripTitle: string;
  variant?: "glass" | "danger";
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isGuest = tripId.startsWith("guest-");

  async function deleteTrip() {
    if (confirm !== "DELETE") return;
    setLoading(true);
    setError("");

    if (isGuest) {
      window.localStorage.removeItem(`tripglass:${tripId}`);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const response = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setLoading(false);
      setError(payload?.error?.message ?? "Could not delete this trip.");
      return;
    }

    setOpen(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      <Button
        variant={variant}
        className={compact ? "min-h-10 px-4" : undefined}
        aria-label={`Delete ${tripTitle}`}
        onClick={() => {
          setOpen(true);
          setConfirm("");
          setError("");
        }}
      >
        <Trash2 className="h-4 w-4" />
        {compact ? "Delete" : "Delete trip"}
      </Button>
      <Modal
        open={open}
        title="Delete trip"
        onClose={() => {
          if (!loading) setOpen(false);
        }}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-slate-300">
            This permanently deletes “{tripTitle}” from your saved trips. This cannot be undone.
          </p>
          <Input
            label='Type "DELETE" to confirm'
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="DELETE"
          />
          {error ? (
            <p className="rounded-2xl border border-rose-300/25 bg-rose-500/[0.12] p-3 text-sm text-rose-100">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              disabled={loading || confirm !== "DELETE"}
              onClick={deleteTrip}
            >
              {loading ? "Deleting..." : "Permanently delete trip"}
            </Button>
            <Button variant="secondary" disabled={loading} onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
