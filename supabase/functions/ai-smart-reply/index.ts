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
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const lastMessages = (messages || []).slice(-5).map((m: any) => `${m.sender}: ${m.content}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es un assistant de messagerie intelligent pour un réseau social professionnel ivoirien. Génère exactement 3 réponses rapides et pertinentes au dernier message de la conversation. Les réponses doivent être courtes (max 15 mots), naturelles, et adaptées au contexte professionnel africain. Retourne UNIQUEMENT un JSON array de 3 strings, sans markdown, sans explication. Exemple: ["Merci beaucoup !", "D'accord, je m'en occupe", "Pouvez-vous préciser ?"]`,
          },
          {
            role: "user",
            content: `Conversation récente:\n${lastMessages}\n\nContexte: ${context || "conversation professionnelle"}\n\nGénère 3 réponses rapides.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    let suggestions: string[];
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      suggestions = JSON.parse(cleaned);
    } catch {
      suggestions = ["👍 D'accord", "Merci !", "Je reviens vers vous"];
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 3) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI smart reply error:", error);
    return new Response(
      JSON.stringify({ suggestions: ["👍 D'accord", "Merci !", "Je reviens vers vous"] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
