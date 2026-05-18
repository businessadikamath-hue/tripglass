import { AppShell } from "@/components/layout/AppShell";
import { TripWizard } from "@/components/trips/TripWizard";

export default function NewTripPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">Create a trip</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Build a day-by-day itinerary with budget awareness, source labels, weather, and map pins.
        </p>
      </div>
      <TripWizard />
    </AppShell>
  );
}
