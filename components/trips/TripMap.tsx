"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, MapPinned } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getMapPins } from "@/lib/utils/maps";
import type { TripItinerary } from "@/types/trip";

declare global {
  interface Window {
    google?: typeof google;
    tripGlassGoogleMapsPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.tripGlassGoogleMapsPromise) return window.tripGlassGoogleMapsPromise;

  window.tripGlassGoogleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Google Maps."));
    document.head.appendChild(script);
  });

  return window.tripGlassGoogleMapsPromise;
}

type MapPin = ReturnType<typeof getMapPins>[number];

function MapCanvas({
  pins,
  apiKey,
  className,
}: {
  pins: MapPin[];
  apiKey: string;
  className: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !ref.current || pins.length === 0) return;

    let cancelled = false;
    setError(null);
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        const map = new window.google.maps.Map(ref.current, {
          center: { lat: pins[0].place.lat!, lng: pins[0].place.lng! },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#172033" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
            { featureType: "water", stylers: [{ color: "#0b2538" }] },
            { featureType: "poi", stylers: [{ visibility: "simplified" }] },
          ],
        });
        const bounds = new window.google.maps.LatLngBounds();
        pins.forEach((pin) => {
          const position = { lat: pin.place.lat!, lng: pin.place.lng! };
          bounds.extend(position);
          const marker = new window.google.maps.Marker({
            position,
            map,
            label: pin.label,
            title: pin.title,
          });
          const info = new window.google.maps.InfoWindow({
            content: `<div style="max-width:220px"><strong>${pin.title}</strong><br/>${pin.start_time} - ${pin.end_time}<br/>${pin.place.name ?? ""}<br/><span>${pin.coordinateConfidence === "estimated" ? "Estimated map area" : "Mapped place"}</span></div>`,
          });
          marker.addListener("click", () => info.open({ map, anchor: marker }));
        });
        map.fitBounds(bounds);
      })
      .catch(() =>
        setError("Map could not load. Check your browser Google Maps key and domain restrictions."),
      );

    return () => {
      cancelled = true;
    };
  }, [apiKey, pins]);

  if (error) {
    return (
      <div className="grid min-h-80 place-items-center p-6 text-center">
        <p className="text-sm text-rose-100">{error}</p>
      </div>
    );
  }

  return <div ref={ref} className={className} />;
}

export function TripMap({
  itinerary,
  destinationLat,
  destinationLng,
  destinationText,
}: {
  itinerary: TripItinerary;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destinationText?: string | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [expanded, setExpanded] = useState(false);
  const [resolvedCenter, setResolvedCenter] = useState<{ lat: number; lng: number } | null>(null);
  const centerLat = destinationLat ?? resolvedCenter?.lat ?? null;
  const centerLng = destinationLng ?? resolvedCenter?.lng ?? null;
  const pins = useMemo(
    () =>
      getMapPins(itinerary, {
        destinationLat: centerLat,
        destinationLng: centerLng,
        destinationText,
      }),
    [centerLat, centerLng, destinationText, itinerary],
  );

  useEffect(() => {
    if (centerLat !== null || centerLng !== null || !destinationText) return;
    let cancelled = false;
    fetch(`/api/places/search?q=${encodeURIComponent(destinationText)}`)
      .then((response) => response.json())
      .then((payload) => {
        const place = payload.places?.find(
          (item: { lat?: number | null; lng?: number | null }) =>
            typeof item.lat === "number" && typeof item.lng === "number",
        );
        if (!cancelled && place) setResolvedCenter({ lat: place.lat, lng: place.lng });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [centerLat, centerLng, destinationText]);

  if (!apiKey) {
    return (
      <GlassCard className="grid min-h-80 place-items-center p-6 text-center">
        <MapPinned className="mb-4 h-8 w-8 text-cyan-100" />
        <h3 className="text-lg font-semibold text-white">Map unavailable</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-300">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to render the interactive map. The itinerary still works without it.
        </p>
      </GlassCard>
    );
  }

  if (pins.length === 0) {
    return (
      <GlassCard className="grid min-h-80 place-items-center p-6 text-center">
        <MapPinned className="mb-4 h-8 w-8 text-cyan-100" />
        <h3 className="text-lg font-semibold text-white">Map unavailable for this itinerary.</h3>
        <p className="mt-2 max-w-sm text-sm text-slate-300">
          No itinerary items include coordinates yet.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden p-2">
      <button
        type="button"
        className="block w-full text-left"
        aria-label="Expand map"
        onClick={() => setExpanded(true)}
      >
        <MapCanvas pins={pins} apiKey={apiKey} className="h-[460px] min-h-80 rounded-[22px]" />
      </button>
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-slate-400">
        <span>{pins.length} mapped stops</span>
        <Button variant="ghost" className="min-h-9 px-3" onClick={() => setExpanded(true)}>
          <Expand className="h-4 w-4" />
          Expand
        </Button>
      </div>
      <Modal
        open={expanded}
        title="Trip map"
        onClose={() => setExpanded(false)}
        className="max-w-6xl"
      >
        <div className="overflow-hidden rounded-3xl">
          <MapCanvas pins={pins} apiKey={apiKey} className="h-[min(76vh,720px)] min-h-[420px]" />
        </div>
      </Modal>
    </GlassCard>
  );
}
