import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { identifier, password } = await req.json();

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      identifier.trim().length < 2 ||
      identifier.length > 255 ||
      password.length < 6 ||
      password.length > 200
    ) {
      return json({ error: "Identifiant ou mot de passe invalide" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Resolve the username to an email server-side only; the email is never
    // returned to the client, which prevents username -> email enumeration.
    const admin = createClient(supabaseUrl, serviceKey);
    let email = identifier.trim();

    if (!email.includes("@")) {
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .ilike("username", email)
        .maybeSingle();

      if (!profile) {
        return json({ error: "Identifiant ou mot de passe incorrect" }, 401);
      }

      const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
      if (!authUser?.user?.email) {
        return json({ error: "Identifiant ou mot de passe incorrect" }, 401);
      }
      email = authUser.user.email;
    }

    const anon = createClient(supabaseUrl, anonKey);
    const { data, error } = await anon.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return json({ error: "Identifiant ou mot de passe incorrect" }, 401);
    }

    return json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (_error) {
    return json({ error: "Connexion impossible" }, 500);
  }
});
