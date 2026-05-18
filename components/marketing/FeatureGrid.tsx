import {
  CloudSun,
  DollarSign,
  Map,
  MessageSquareText,
  Route,
  Share2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

const features = [
  {
    title: "AI-built itineraries",
    description: "Structured daily plans tuned to your destination, dates, pace, and constraints.",
    icon: Route,
  },
  {
    title: "Map-first planning",
    description: "Pins and place metadata keep each day grounded in real geography.",
    icon: Map,
  },
  {
    title: "Budget-aware suggestions",
    description: "Cost estimates stay labeled as estimates and roll up into a clear budget view.",
    icon: DollarSign,
  },
  {
    title: "Weather-aware days",
    description: "Near-term trips can include Open-Meteo forecasts and packing notes.",
    icon: CloudSun,
  },
  {
    title: "Revise anything",
    description: "Ask for cheaper, calmer, more romantic, or more accessible plans.",
    icon: MessageSquareText,
  },
  {
    title: "Share beautiful plans",
    description: "Publish a read-only itinerary link without exposing private account details.",
    icon: Share2,
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">A calm command center for travel.</h2>
        <p className="mt-3 text-slate-300">
          Every surface is built for practical planning: editable, source-aware, and ready for real integrations.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <GlassCard key={feature.title} className="p-6" intensity="subtle">
            <feature.icon className="mb-5 h-6 w-6 text-cyan-100" />
            <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
}
