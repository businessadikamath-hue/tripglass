import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { BackgroundOrbs } from "@/components/layout/BackgroundOrbs";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (user) redirect("/dashboard");

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <BackgroundOrbs />
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </main>
  );
}
