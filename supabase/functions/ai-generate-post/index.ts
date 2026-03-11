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
    const { topic, style, includeTable, mentions, context, rawContent, formFields } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isStructuring = !!rawContent;

    const systemPrompt = `Tu es un expert en création de contenu professionnel ultra-structuré pour réseaux sociaux et plateformes professionnelles africaines.

${isStructuring ? `
🎯 MODE STRUCTURATION AUTOMATIQUE

Tu reçois du TEXTE BRUT non formaté. Tu dois:
1. ANALYSER le contexte, l'objectif et le public cible
2. RESTRUCTURER intelligemment en HTML professionnel
3. GÉNÉRER automatiquement TOUS les champs demandés

RÈGLES ABSOLUES:
- L'utilisateur n'écrit AUCUN balisage - TU FAIS TOUT
- Détecte automatiquement le type de contenu (annonce, offre, article, etc.)
- Structure avec chapitres, sous-titres, paragraphes clairs
- Ajoute des sauts de ligne pour la lisibilité
` : `
🎯 MODE GÉNÉRATION COMPLÈTE
Tu génères une publication professionnelle complète à partir du sujet donné.
`}

📋 STRUCTURE DE RÉPONSE OBLIGATOIRE (JSON):
{
  "title": "Titre accrocheur en gras (max 80 caractères)",
  "hook": "Phrase d'accroche captivante en italique qui attire l'attention",
  "content": "Contenu HTML complet et bien structuré",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "category": "Type de contenu détecté",
  "summary": "Résumé court de 2-3 phrases"
}

🎨 FORMATAGE HTML OBLIGATOIRE DU CONTENT:

1. TITRE PRINCIPAL: <h2 style="font-weight:bold;margin-bottom:12px;">🎯 Titre avec emoji pertinent</h2>

2. SOUS-TITRE/ACCROCHE: <p style="font-style:italic;color:#666;margin-bottom:16px;">Phrase captivante</p>

3. PARAGRAPHES: 
   - Dans des <p style="margin-bottom:12px;line-height:1.7;"> distincts
   - Maximum 4-5 lignes par paragraphe
   - Séparation nette entre sections

4. HIÉRARCHIE DES TITRES:
   - <h2 style="font-weight:bold;margin:20px 0 10px;"> pour sections majeures
   - <h3 style="font-weight:600;margin:16px 0 8px;"> pour sous-sections

5. MISE EN FORME:
   - <strong>Mots clés importants</strong>
   - <em>Termes techniques ou accent</em>
   - <span style="color:#1a73e8;">Texte coloré pour emphase</span>
   - <mark style="background:#fff3cd;padding:2px 4px;border-radius:3px;">Surlignage pour focus</mark>

6. LISTES STRUCTURÉES:
   <ul style="margin:12px 0;padding-left:24px;">
     <li style="margin-bottom:8px;">✅ Point 1</li>
     <li style="margin-bottom:8px;">✅ Point 2</li>
   </ul>

7. TABLEAUX (OBLIGATOIRE si demandé ou pertinent - comparatifs, statistiques, planning, prix):
   <table style="width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;">
     <thead>
       <tr style="background:linear-gradient(135deg,#1a73e8,#4285f4);">
         <th style="border:1px solid #dee2e6;padding:12px 16px;text-align:left;font-weight:600;color:white;">En-tête 1</th>
         <th style="border:1px solid #dee2e6;padding:12px 16px;text-align:left;font-weight:600;color:white;">En-tête 2</th>
         <th style="border:1px solid #dee2e6;padding:12px 16px;text-align:left;font-weight:600;color:white;">En-tête 3</th>
       </tr>
     </thead>
     <tbody>
       <tr style="background:#f8f9fa;">
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
       </tr>
       <tr>
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
         <td style="border:1px solid #dee2e6;padding:10px 16px;">Valeur</td>
       </tr>
     </tbody>
   </table>

8. CITATIONS:
   <blockquote style="border-left:4px solid #1a73e8;padding:12px 16px;margin:16px 0;font-style:italic;background:#f8f9ff;border-radius:0 8px 8px 0;">
     Citation importante ou témoignage
   </blockquote>

9. ENCADRÉ IMPORTANT:
   <div style="background:linear-gradient(135deg,#e8f0fe,#f0f5ff);border:1px solid #1a73e8;border-radius:12px;padding:16px;margin:16px 0;">
     <strong>💡 Point clé:</strong> Information importante mise en valeur
   </div>

10. CALL-TO-ACTION FINAL:
    <div style="margin-top:24px;padding:16px;background:linear-gradient(135deg,#1a73e8,#4285f4);border-radius:12px;text-align:center;">
      <p style="color:white;font-weight:600;margin:0;">👉 Action attendue - Question engageante</p>
    </div>

📝 RÈGLES DE STYLE:
- Professionnel mais accessible et humain
- Dynamique et engageant - pas de ton robotique
- Orienté valeur pour le lecteur
- Adapté au contexte ivoirien et africain
- Paragraphes courts et aérés (max 4 lignes)
- Emojis pertinents mais pas excessifs
- JAMAIS de blocs de texte compacts illisibles
- TOUJOURS inclure un tableau si le contenu s'y prête (comparaisons, statistiques, planning, prix, avantages)

#️⃣ HASHTAGS:
- 5-8 hashtags pertinents et professionnels
- En rapport avec le secteur et le contexte local
- Mix de généraux (#CoteDIvoire #Afrique) et spécifiques

⚠️ RÉPONSE UNIQUEMENT EN FORMAT JSON VALIDE`;

    let userPrompt = "";
    
    if (isStructuring) {
      userPrompt = `TEXTE BRUT À STRUCTURER:
"""
${rawContent}
"""

${formFields ? `CHAMPS DU FORMULAIRE À REMPLIR: ${JSON.stringify(formFields)}` : ''}

Analyse ce texte brut et génère une réponse JSON complète avec:
- Un titre accrocheur extrait/généré
- Une phrase d'accroche captivante
- Le contenu restructuré professionnellement en HTML avec des TABLEAUX si pertinent
- Des hashtags pertinents
- La catégorie détectée
- Un résumé court`;
    } else {
      userPrompt = `SUJET: "${topic}"

STYLE: ${style || 'professional'}
${includeTable ? '\n✅ INCLURE OBLIGATOIREMENT UN TABLEAU COMPARATIF OU INFORMATIF BIEN STYLISÉ' : ''}
${mentions && mentions.length > 0 ? `\n👥 MENTIONNER: ${mentions.join(', ')}` : ''}
${context ? `\n📝 CONTEXTE ADDITIONNEL: ${context}` : ''}

Génère une publication professionnelle complète au format JSON avec tous les champs requis.
${includeTable ? 'Le TABLEAU est OBLIGATOIRE dans le contenu HTML.' : 'Inclus un tableau si c\'est pertinent pour le sujet.'}`;
    }

    console.log("[ai-generate-post] Processing request:", { isStructuring, topic, hasRawContent: !!rawContent, includeTable });

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
        temperature: 0.7,
        response_format: { type: "json_object" },
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Veuillez recharger." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent2 = data.choices?.[0]?.message?.content || "{}";
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(rawContent2);
    } catch (e) {
      console.error("[ai-generate-post] Failed to parse JSON:", rawContent2);
      parsedResult = {
        title: "",
        hook: "",
        content: rawContent2,
        hashtags: [],
        category: "general",
        summary: ""
      };
    }

    const hashtags = (parsedResult.hashtags || []).map((h: string) => 
      h.replace(/^#/, '').trim()
    ).filter((h: string) => h.length > 0);

    console.log("[ai-generate-post] Successfully generated structured post");

    return new Response(
      JSON.stringify({ 
        content: parsedResult.content || "",
        hashtags,
        suggestedTitle: parsedResult.title || "",
        suggestedHook: parsedResult.hook || "",
        category: parsedResult.category || "general",
        summary: parsedResult.summary || ""
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
