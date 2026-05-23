import { Suspense } from "react";
import { AccountComplete } from "@/components/auth/AccountComplete";
import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";

export default function SignupCompletePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <BackgroundOrbs />
      <Suspense>
        <AccountComplete />
      </Suspense>
    </main>
  );
}
