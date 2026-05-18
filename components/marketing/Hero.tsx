import { ArrowRight, MapPinned, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { DemoTripPreview } from "@/components/marketing/DemoTripPreview";

export function Hero() {
  return (
    <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-6 pb-20 pt-32 lg:grid-cols-[1fr_0.9fr] lg:px-8">
      <div>
        <Badge variant="info" className="mb-6">
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          AI-powered itineraries, beautifully organized.
        </Badge>
        <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-white sm:text-6xl lg:text-7xl">
          Plan your next trip in minutes.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          TripGlass turns your destination, budget, and travel style into a beautiful
          day-by-day itinerary with maps, costs, weather, and smart AI revisions.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/trips/new" className="rounded-full px-7">
            Plan a Trip
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button href="#demo" variant="secondary" className="rounded-full px-7">
            <MapPinned className="h-4 w-4" />
            View Demo
          </Button>
        </div>
      </div>
      <DemoTripPreview />
    </section>
  );
}
