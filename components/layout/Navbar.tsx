import Link from "next/link";
import { Compass, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="TripGlass home">
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/[0.10] shadow-lg backdrop-blur-xl">
        <Compass className="h-5 w-5 text-cyan-100" />
      </span>
      <span className="text-lg font-semibold tracking-normal text-white">TripGlass</span>
    </Link>
  );
}

export function MarketingNavbar() {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 px-4 py-4 sm:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/[0.15] bg-white/[0.07] px-4 py-3 backdrop-blur-2xl">
        <Logo />
        <div className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-white">
            Features
          </a>
          <a href="#demo" className="hover:text-white">
            Demo
          </a>
          <a href="#how" className="hover:text-white">
            How it works
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button href="/trips/new" className="rounded-full">
            Plan a Trip
          </Button>
        </div>
      </nav>
    </header>
  );
}

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111F]/70 px-4 py-3 backdrop-blur-2xl lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Button href="/dashboard" variant="ghost" className="hidden sm:inline-flex">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Button>
          <Button href="/settings" variant="ghost" className="hidden sm:inline-flex">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button href="/trips/new" className="rounded-full">
            New Trip
          </Button>
        </div>
      </div>
    </header>
  );
}
