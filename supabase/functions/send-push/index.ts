// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// This function acts as a Webhook destination for the `notifications` table inserts.
serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record; // The new notification row

    if (!notification || !notification.recipient_id) {
      return new Response("Invalid payload", { status: 400 });
    }

    // Initialize Supabase Client to fetch push tokens and preferences
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if user wants this type of notification
    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', notification.recipient_id)
      .single();

    if (prefs) {
      if (prefs.quiet_hours_enabled) {
        // Implement quiet hours check based on user timezone (MVP skips this)
      }
      
      const type = notification.type;
      if (
        (type === 'reaction' && !prefs.reactions) ||
        (type === 'comment' && !prefs.comments) ||
        (type === 'follow' && !prefs.new_followers)
      ) {
        return new Response("Notification disabled by user prefs", { status: 200 });
      }
    }

    // 2. Get the push tokens for the recipient
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', notification.recipient_id);

    if (!tokens || tokens.length === 0) {
      return new Response("No push tokens for user", { status: 200 });
    }

    // 3. Send to FCM or Expo (depending on how token was acquired)
    // For MVP, we pretend we're sending a native FCM / APNs request.
    // We would use firebase-admin here or directly call FCM HTTP v1.
    // Example pseudocode:
    
    const sendPromises = tokens.map(async (t) => {
      console.log(`Sending push to token ${t.token} on ${t.platform}`);
      // await fetch('https://fcm.googleapis.com/v1/projects/my-project/messages:send', { ... })
      return { success: true, token: t.token };
    });

    await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({ message: "Push sent successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
});
