import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = text;

    switch (action) {
      case "correct":
        systemPrompt = `Tu es un correcteur professionnel. Corrige les fautes d'orthographe, de grammaire et de syntaxe dans le texte suivant. Retourne uniquement le texte corrigé, sans explications.`;
        break;
      
      case "improve":
        systemPrompt = `Tu es un rédacteur professionnel. Améliore le texte suivant pour le rendre plus clair, plus engageant et plus professionnel. Conserve le sens original. Retourne uniquement le texte amélioré.`;
        break;
      
      case "summarize":
        systemPrompt = `Tu es un expert en synthèse. Résume le texte suivant en conservant les points essentiels. Sois concis mais complet.`;
        break;
      
      case "expand":
        systemPrompt = `Tu es un rédacteur créatif. Développe et enrichis le texte suivant avec plus de détails, d'exemples et d'explications. Garde un ton professionnel.`;
        break;
      
      case "translate_en":
        systemPrompt = `Tu es un traducteur professionnel. Traduis le texte suivant en anglais. Retourne uniquement la traduction.`;
        break;
      
      case "translate_fr":
        systemPrompt = `Tu es un traducteur professionnel. Traduis le texte suivant en français. Retourne uniquement la traduction.`;
        break;
      
      case "formal":
        systemPrompt = `Tu es un rédacteur d'affaires. Reformule le texte suivant dans un ton formel et professionnel, adapté à la communication d'entreprise.`;
        break;
      
      case "casual":
        systemPrompt = `Tu es un community manager. Reformule le texte suivant dans un ton décontracté et amical, adapté aux réseaux sociaux.`;
        break;
      
      case "suggest_hashtags":
        systemPrompt = `Tu es un expert en réseaux sociaux. Suggère 5 à 10 hashtags pertinents pour le texte suivant. Retourne uniquement les hashtags, séparés par des espaces.`;
        break;
      
      case "suggest_title":
        systemPrompt = `Tu es un rédacteur de titres. Suggère 3 titres accrocheurs pour le contenu suivant. Retourne uniquement les titres, un par ligne.`;
        break;
      
      default:
        systemPrompt = `Tu es un assistant IA utile. Aide l'utilisateur avec sa demande.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
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

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
