"use client";

import { useEffect } from "react";

export function GuestTripMigrator() {
  useEffect(() => {
    async function migrate() {
      const keys = Object.keys(window.localStorage).filter((key) =>
        key.startsWith("tripglass:guest-"),
      );

      for (const key of keys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;

        try {
          const response = await fetch("/api/trips/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: raw,
          });

          if (response.ok) window.localStorage.removeItem(key);
        } catch {
          // Keep local trips in place so a later signed-in visit can retry.
        }
      }
    }

    migrate();
  }, []);

  return null;
}
