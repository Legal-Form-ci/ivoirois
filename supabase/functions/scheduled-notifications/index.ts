import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get scheduled messages that are due
    const now = new Date().toISOString();
    
    const { data: scheduledMessages, error: msgError } = await supabase
      .from("scheduled_messages")
      .select(`
        *,
        profiles:sender_id(full_name, avatar_url),
        conversations(id)
      `)
      .eq("status", "pending")
      .lte("scheduled_at", now);

    if (msgError) {
      console.error("Error fetching scheduled messages:", msgError);
      throw msgError;
    }

    console.log(`Found ${scheduledMessages?.length || 0} scheduled messages to process`);

    // Process each scheduled message
    for (const msg of scheduledMessages || []) {
      // Insert as actual message
      const { data: newMessage, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: msg.conversation_id,
          sender_id: msg.sender_id,
          content: msg.content,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting message:", insertError);
        continue;
      }

      // Update scheduled message status
      await supabase
        .from("scheduled_messages")
        .update({ status: "sent" })
        .eq("id", msg.id);

      // Get recipient's push subscription
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", msg.conversation_id)
        .neq("user_id", msg.sender_id);

      for (const participant of participants || []) {
        const { data: subscription } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", participant.user_id)
          .single();

        if (subscription) {
          // Send push notification
          try {
            const payload = {
              title: `Message de ${msg.profiles?.full_name || "Quelqu'un"}`,
              body: msg.content.replace(/<[^>]*>/g, '').substring(0, 100),
              icon: msg.profiles?.avatar_url || "/logo.png",
              data: {
                url: `/messages/${msg.conversation_id}`
              }
            };

            console.log("Would send push notification:", payload);
            // Note: Actual push notification sending would require web-push library
            // For now, we create a notification in the database
            
            await supabase
              .from("notifications")
              .insert({
                user_id: participant.user_id,
                from_user_id: msg.sender_id,
                type: "scheduled_message",
                content: `Message programmé de ${msg.profiles?.full_name || "Quelqu'un"}`
              });
          } catch (pushError) {
            console.error("Error sending push:", pushError);
          }
        }
      }
    }

    // Also check for scheduled posts
    const { data: scheduledPosts, error: postError } = await supabase
      .from("scheduled_posts")
      .select(`
        *,
        profiles:user_id(full_name)
      `)
      .eq("status", "pending")
      .lte("scheduled_at", now);

    if (postError) {
      console.error("Error fetching scheduled posts:", postError);
    }

    console.log(`Found ${scheduledPosts?.length || 0} scheduled posts to process`);

    for (const post of scheduledPosts || []) {
      // Insert as actual post
      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: post.user_id,
          content: post.content,
          title: post.title,
          hook: post.hook,
          media_urls: post.media_urls,
          media_types: post.media_types,
          links: post.links,
          hashtags: post.hashtags,
        });

      if (insertError) {
        console.error("Error inserting post:", insertError);
        continue;
      }

      // Update scheduled post status
      await supabase
        .from("scheduled_posts")
        .update({ status: "published" })
        .eq("id", post.id);

      // Create notification for the author
      await supabase
        .from("notifications")
        .insert({
          user_id: post.user_id,
          type: "scheduled_post",
          content: "Votre publication programmée a été publiée"
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: {
          messages: scheduledMessages?.length || 0,
          posts: scheduledPosts?.length || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scheduled notifications error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});