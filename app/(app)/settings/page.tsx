import { AppShell } from "@/components/layout/AppShell";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { isGeminiConfigured } from "@/lib/server/gemini";
import { isGooglePlacesConfigured } from "@/lib/server/googlePlaces";
import { isOpenAIConfigured } from "@/lib/server/openai";
import { createClient, isSupabaseServerConfigured } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const { data: profile } =
    supabase && user
      ? await supabase.from("profiles").select("*").eq("id", user.id).single()
      : { data: null };

  return (
    <AppShell>
      <SettingsForm
        profile={profile}
        integrations={{
          supabase: isSupabaseServerConfigured(),
          openai: isOpenAIConfigured(),
          gemini: isGeminiConfigured(),
          googleMaps: isGooglePlacesConfigured(),
          openMeteo: true,
        }}
      />
    </AppShell>
  );
}
