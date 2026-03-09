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
    const { prompt, action, imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let messages: any[] = [];
    let model = "google/gemini-3-pro-image-preview";

    if (action === "generate") {
      messages = [
        {
          role: "user",
          content: `Generate a high-quality, ultra-realistic professional image: ${prompt || "A beautiful professional image"}. No text, no watermark, no logos, clean composition, high resolution.`,
        },
      ];
    } else if (action === "edit" && imageBase64) {
      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt || "Improve this image professionally" },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ];
    } else if (action === "caption") {
      // Caption uses text-only model
      model = "google/gemini-2.5-flash";
      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Décris cette image en une phrase courte et engageante en français, adaptée pour un réseau social professionnel africain. Retourne UNIQUEMENT la description, sans guillemets.",
            },
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
          ],
        },
      ];
    } else {
      throw new Error("Invalid action. Use 'generate', 'edit', or 'caption'");
    }

    const isTextOnly = action === "caption";

    const requestBody: any = {
      model,
      messages,
    };

    if (!isTextOnly) {
      requestBody.modalities = ["image", "text"];
    }

    console.log(`[ai-image-generate] Action: ${action}, Model: ${model}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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

      throw new Error(`AI Gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract text content
    const messageContent = data.choices?.[0]?.message?.content;
    let textContent = "";
    let images: string[] = [];

    if (typeof messageContent === "string") {
      textContent = messageContent;
    } else if (Array.isArray(messageContent)) {
      for (const part of messageContent) {
        if (part.type === "text") {
          textContent += part.text || "";
        } else if (part.type === "image_url") {
          images.push(part.image_url?.url || "");
        }
      }
    }

    // Also check for images in the standard location
    const messageImages = data.choices?.[0]?.message?.images || [];
    if (messageImages.length > 0) {
      images = [...images, ...messageImages.map((img: any) => img.image_url?.url || img.url || "")];
    }

    console.log(`[ai-image-generate] Result: text=${textContent.length}chars, images=${images.length}`);

    return new Response(
      JSON.stringify({
        text: textContent,
        images: images.filter(Boolean),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI image generate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
