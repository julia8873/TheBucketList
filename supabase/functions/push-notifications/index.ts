import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export default {
  fetch: withSupabase({ auth: ["secret"] }, async (req, ctx) => {
    try {
      const payload = await req.json();
      console.log('Webhook payload:', payload);

      if (payload.type === 'INSERT' && payload.table === 'notifications') {
        const record = payload.record;

        // Fetch the recipient's push token
        const { data: profile } = await ctx.supabaseAdmin
          .from('profiles')
          .select('push_token, display_name, username')
          .eq('id', record.recipient_id)
          .single();

        if (!profile || !profile.push_token) {
          console.log('No push token found for user:', record.recipient_id);
          return Response.json({ message: 'No push token' });
        }

        // Fetch the actor's info
        const { data: actor } = await ctx.supabaseAdmin
          .from('profiles')
          .select('display_name, username')
          .eq('id', record.actor_id)
          .single();

        const actorName = actor?.display_name || actor?.username || 'Someone';

        let title = 'New Activity';
        let body = `${actorName} interacted with your bucket.`;

        if (record.type === 'reaction') {
          title = 'New Reaction';
          body = `${actorName} reacted to your bucket list item.`;
        } else if (record.type === 'comment') {
          title = 'New Comment';
          body = `${actorName} commented on your bucket list item.`;
        }

        // Send to Expo
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: profile.push_token,
            sound: 'default',
            title,
            body,
            data: { notificationId: record.id, bucketId: record.bucket_id },
          }),
        });

        const expoResult = await response.json();
        console.log('Expo Push Result:', expoResult);
        return Response.json(expoResult);
      }

      return Response.json({ message: 'OK' });
    } catch (error) {
      console.error('Error in push notification:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Response.json({ error: errorMessage }, { status: 500 });
    }
  }),
};
