import { CalendarDays, Home, PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/trips/new", label: "New Trip", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 space-y-3 rounded-3xl border border-white/[0.12] bg-white/[0.06] p-3 backdrop-blur-2xl">
        {links.map((link) => (
          <Button
            key={link.href}
            href={link.href}
            variant="ghost"
            className="w-full justify-start"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Button>
        ))}
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
          <CalendarDays className="mb-3 h-5 w-5 text-cyan-100" />
          <p className="text-sm font-medium text-white">Plan with confidence</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Live integrations stay server-side, with mock mode ready for local development.
          </p>
        </div>
      </div>
    </aside>
  );
}
