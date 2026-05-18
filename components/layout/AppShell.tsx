import { AppTopbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";
import { ToastProvider } from "@/components/ui/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <BackgroundOrbs />
      <AppTopbar />
      <main className="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <Sidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </ToastProvider>
  );
}
