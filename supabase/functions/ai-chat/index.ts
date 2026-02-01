import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("[AI Chat] Starting streaming chat, messages:", messages.length);

    const systemPrompt = `Tu es l'Assistant IA d'Ivoi'Rois, une plateforme sociale et professionnelle ivoirienne. Tu es intelligent, amical et professionnel.

Contexte utilisateur:
- Nom: ${context?.userName || 'Utilisateur'}
- Plateforme: ${context?.platform || 'Ivoi\'Rois'}

Tes capacités:
1. **Rédaction de contenu**: Posts professionnels, articles, descriptions
2. **Aide CV**: Conseils, rédaction de résumés, amélioration
3. **Génération d'idées**: Topics tendance, inspiration créative
4. **Correction de texte**: Orthographe, grammaire, style
5. **Traduction**: Français, anglais et autres langues
6. **Conseils professionnels**: Carrière, networking, personal branding

Règles:
- Réponds toujours en français sauf si on te demande une autre langue
- Sois concis mais complet
- Utilise le formatage markdown pour la lisibilité
- Sois encourageant et positif
- Adapte ton ton au contexte (formel pour le business, amical pour le social)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Chat] Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants. Veuillez recharger votre compte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    console.log("[AI Chat] Streaming response started");

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
