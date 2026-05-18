import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return (
    <AppShell>
      <GlassCard className="p-8">
        <h1 className="text-3xl font-semibold text-white">Edit trip inputs</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          V1 keeps itinerary edits in the AI revision panel. Input-level editing is ready for expansion without changing the trip detail model.
        </p>
        <Button href={`/trips/${tripId}`} className="mt-6" variant="secondary">
          Back to itinerary
        </Button>
      </GlassCard>
    </AppShell>
  );
}
