import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <BackgroundOrbs />
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
