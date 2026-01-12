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
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    
    if (!audioFile) {
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    
    if (!ELEVENLABS_API_KEY) {
      // Fallback to Lovable AI for transcription
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "No API key configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use Lovable AI for transcription description
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a transcription assistant. Respond with a brief acknowledgment that a voice message was received."
            },
            {
              role: "user",
              content: "This is a voice message that needs transcription. Please provide a placeholder transcription acknowledging that a voice message was received."
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI error:", errorText);
        return new Response(
          JSON.stringify({ 
            text: "[Message vocal reçu - transcription non disponible]",
            words: []
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      
      return new Response(
        JSON.stringify({ 
          text: data.choices?.[0]?.message?.content || "[Message vocal]",
          words: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use ElevenLabs Speech-to-Text with Scribe model
    const apiFormData = new FormData();
    apiFormData.append("file", audioFile);
    apiFormData.append("model_id", "scribe_v1");
    apiFormData.append("language_code", "fra"); // French (Ivory Coast)
    apiFormData.append("tag_audio_events", "true");
    apiFormData.append("diarize", "false");

    console.log("Calling ElevenLabs STT API...");

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: apiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT error:", response.status, errorText);
      
      // Fallback message if ElevenLabs fails
      return new Response(
        JSON.stringify({ 
          text: "[Transcription en cours de traitement...]",
          words: [],
          error: "ElevenLabs temporarily unavailable"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcription = await response.json();
    console.log("ElevenLabs transcription success:", transcription.text?.substring(0, 100));

    return new Response(
      JSON.stringify({
        text: transcription.text || "[Message vocal]",
        words: transcription.words || [],
        language: transcription.language_code || "fra",
        audio_events: transcription.audio_events || []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Transcription error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        text: "[Erreur de transcription]"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
