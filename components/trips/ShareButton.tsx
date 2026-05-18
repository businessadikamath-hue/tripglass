"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function ShareButton({
  tripId,
  initialSlug,
}: {
  tripId: string;
  initialSlug?: string | null;
}) {
  const [slug, setSlug] = useState(initialSlug ?? null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function enableShare() {
    if (tripId.startsWith("guest-")) {
      toast.push("Sign in to publish share links.", "error");
      return;
    }
    if (slug) {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`);
      toast.push("Share link copied.");
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/trips/${tripId}/share`, { method: "POST" });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.push(payload.error?.message ?? "Unable to enable sharing.", "error");
      return;
    }
    setSlug(payload.slug);
    await navigator.clipboard.writeText(`${window.location.origin}/share/${payload.slug}`);
    toast.push("Public share link enabled and copied.");
  }

  return (
    <Button variant="secondary" onClick={enableShare} disabled={loading}>
      {slug ? <Copy className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {slug ? "Copy link" : "Share"}
    </Button>
  );
}
