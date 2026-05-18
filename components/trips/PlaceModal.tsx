"use client";

import { Modal } from "@/components/ui/Modal";
import type { ItineraryItem } from "@/types/trip";

export function PlaceModal({
  item,
  onClose,
}: {
  item: ItineraryItem | null;
  onClose: () => void;
}) {
  return (
    <Modal open={Boolean(item)} title={item?.place.name ?? item?.title ?? "Place"} onClose={onClose}>
      {item ? (
        <div className="space-y-3 text-sm text-slate-300">
          <p>{item.description}</p>
          <p>{item.place.address ?? "Address unavailable."}</p>
          <p>{item.booking_note ?? "No booking availability has been verified."}</p>
        </div>
      ) : null}
    </Modal>
  );
}
