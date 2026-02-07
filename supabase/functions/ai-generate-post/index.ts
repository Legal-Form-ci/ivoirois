import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic, style, includeTable, mentions, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un expert en création de contenu professionnel pour réseaux sociaux. Tu génères des publications exceptionnelles, bien structurées et engageantes.

RÈGLES DE FORMATAGE OBLIGATOIRES:
1. **Titre principal**: Toujours en gras avec un emoji pertinent au début
2. **Sous-titre/Accroche**: En italique, phrase captivante qui attire l'attention
3. **Corps du texte**: 
   - Paragraphes clairs avec sauts de ligne
   - Points clés en liste à puces ou numérotée
   - Mots importants en **gras**
   - Termes techniques en *italique*
4. **Structure en sections**: Utilise des sous-titres (## ou ###) pour organiser
5. **Tableau**: Si demandé, crée un tableau HTML bien formaté avec header
6. **Mentions**: Intègre naturellement les mentions avec @
7. **Call-to-action**: Termine par une question ou invitation à l'engagement
8. **Hashtags**: Génère 5-8 hashtags pertinents et professionnels à la fin

STYLE DE RÉDACTION:
- Professionnel mais accessible
- Dynamique et engageant
- Orienté valeur pour le lecteur
- Adapté au contexte ivoirien et africain

FORMATS HTML AUTORISÉS:
- <h2>, <h3> pour les titres
- <p> pour les paragraphes
- <strong> pour le gras
- <em> pour l'italique
- <ul><li> ou <ol><li> pour les listes
- <blockquote> pour les citations
- <table><thead><tr><th>...<tbody><tr><td> pour les tableaux

Génère UNIQUEMENT le contenu HTML de la publication, sans markdown.`;

    let userPrompt = `Génère une publication professionnelle sur le sujet: "${topic}"`;
    
    if (style) {
      userPrompt += `\n\nStyle souhaité: ${style}`;
    }
    
    if (includeTable) {
      userPrompt += `\n\nInclus un tableau comparatif ou informatif pertinent.`;
    }
    
    if (mentions && mentions.length > 0) {
      userPrompt += `\n\nMentionne ces entités: ${mentions.join(', ')}`;
    }
    
    if (context) {
      userPrompt += `\n\nContexte additionnel: ${context}`;
    }

    console.log("[ai-generate-post] Generating post for topic:", topic);

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
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-generate-post] AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte. Réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content || "";

    // Extract hashtags from the content
    const hashtagMatch = generatedContent.match(/#\w+/g);
    const hashtags = hashtagMatch ? [...new Set(hashtagMatch)] : [];

    // Extract a title (first h2 or strong text)
    const titleMatch = generatedContent.match(/<h2[^>]*>(.*?)<\/h2>/i) || 
                       generatedContent.match(/<strong>(.*?)<\/strong>/);
    const suggestedTitle = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/^\W+/, '') : "";

    // Extract hook (first em or p after title)
    const hookMatch = generatedContent.match(/<em>(.*?)<\/em>/);
    const suggestedHook = hookMatch ? hookMatch[1].replace(/<[^>]*>/g, '') : "";

    console.log("[ai-generate-post] Successfully generated post");

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        hashtags,
        suggestedTitle,
        suggestedHook
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-generate-post] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
