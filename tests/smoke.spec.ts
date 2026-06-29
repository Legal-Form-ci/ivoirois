import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

async function login(page: import("@playwright/test").Page) {
  test.skip(!e2eEmail || !e2ePassword, "Définir E2E_USER_EMAIL et E2E_USER_PASSWORD pour le smoke test connecté complet.");
  await page.goto("/auth");
  await page.getByLabel(/email|identifiant/i).fill(e2eEmail!);
  await page.getByLabel(/mot de passe/i).fill(e2ePassword!);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/(feed|fil|actualites|index)/, { timeout: 15_000 });
}

test.describe("smoke E2E responsive", () => {
  for (const viewport of [
    { width: 390, height: 844, name: "mobile" },
    { width: 768, height: 1024, name: "tablet" },
    { width: 1440, height: 900, name: "desktop" },
  ]) {
    test(`navigation publique sans débordement — ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
      await page.goto("/auth");
      await expect(page.getByRole("button", { name: /se connecter|s'inscrire|envoyer/i })).toBeVisible();
    });
  }
});

test("RLS anon bloque les conversations privées", async () => {
  test.skip(!supabase, "Variables Supabase indisponibles.");
  const { data, error } = await supabase!.from("conversations").select("id").limit(1);
  expect(error || (data ?? []).length === 0).toBeTruthy();
});

test.describe("smoke connecté: login, vocal, live, replay", () => {
  test("login et navigation responsive connectée", async ({ page }) => {
    await login(page);
    for (const route of ["/messages", "/live"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(2);
    }
  });

  test("permissions RLS + création message vocal + création/fin live + replay fallback", async ({ page }) => {
    test.skip(!supabase || !e2eEmail || !e2ePassword, "Variables E2E/Supabase requises.");

    const authClient = createClient(supabaseUrl!, supabaseKey!);
    const { data: auth, error: authError } = await authClient.auth.signInWithPassword({ email: e2eEmail!, password: e2ePassword! });
    expect(authError).toBeNull();
    const userId = auth.user!.id;
    await authClient.rpc("ensure_my_profile");

    const { data: participant } = await authClient
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (participant?.conversation_id) {
      const content = `<div class="voice-message" data-voice-path="${userId}/smoke-test.webm"><p>🎤 Smoke vocal</p></div>`;
      const { data: msg, error: msgError } = await authClient
        .from("messages")
        .insert({ conversation_id: participant.conversation_id, sender_id: userId, content })
        .select("id")
        .single();
      expect(msgError).toBeNull();
      const { error: voiceError } = await authClient
        .from("voice_messages")
        .insert({ message_id: msg!.id, audio_url: `${userId}/smoke-test.webm`, duration: 1, transcription: "Prévisualisation smoke test", transcription_status: "completed" });
      expect(voiceError).toBeNull();
      await authClient.from("messages").delete().eq("id", msg!.id);
    }

    const { data: live, error: liveError } = await authClient
      .from("live_streams")
      .insert({ host_id: userId, title: "Smoke live E2E", description: "Vérification création/fin", status: "live", privacy: "public", started_at: new Date().toISOString(), stream_key: crypto.randomUUID() })
      .select("id")
      .single();
    expect(liveError).toBeNull();
    const { error: endError } = await authClient.from("live_streams").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", live!.id);
    expect(endError).toBeNull();

    await login(page);
    await page.goto("/live");
    await expect(page.getByText(/Live & Replays/i)).toBeVisible();
    await authClient.from("live_streams").delete().eq("id", live!.id);
  });
});