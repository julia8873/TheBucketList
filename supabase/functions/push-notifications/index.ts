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
          .maybeSingle();

        let pushToken = profile?.push_token;

        if (!pushToken) {
          const { data: pt } = await ctx.supabaseAdmin
            .from('push_tokens')
            .select('token')
            .eq('user_id', record.recipient_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (pt?.token) {
            pushToken = pt.token;
          }
        }

        if (!pushToken) {
          console.log('No push token found for user:', record.recipient_id);
          return Response.json({ message: 'No push token' });
        }

        // Respect the recipient's notification preferences (columns *_push)
        const { data: prefs } = await ctx.supabaseAdmin
          .from('notification_prefs')
          .select('*')
          .eq('user_id', record.recipient_id)
          .maybeSingle();

        if (prefs) {
          const t = record.type;
          if (
            (t === 'reaction' && prefs.reaction_push === false) ||
            ((t === 'comment' || t === 'mention') && prefs.comment_push === false) ||
            ((t === 'follow' || t === 'follow_request') && prefs.follow_push === false) ||
            (t === 'deadline' && prefs.deadline_push === false) ||
            (t === 'friend_completed' && prefs.friend_completed_push === false)
          ) {
            return Response.json({ message: 'Disabled by user prefs' });
          }
        }

        // Fetch the actor's info
        const { data: actor } = await ctx.supabaseAdmin
          .from('profiles')
          .select('display_name, username')
          .eq('id', record.actor_id)
          .single();

        const actorName = actor?.display_name || actor?.username || 'Someone';

        let title = 'The Bucket List';
        let body = record.content || `${actorName} ha interactuado con tu lista.`;

        // Title of the task / album so reactions and comments can be specific
        let entityTitle = '';
        let entityNoun = 'tarea';
        if (record.bucket_id) {
          const { data: b } = await ctx.supabaseAdmin.from('buckets').select('title').eq('id', record.bucket_id).maybeSingle();
          entityTitle = b?.title ?? '';
        } else if (record.album_id) {
          const { data: a } = await ctx.supabaseAdmin.from('albums').select('title').eq('id', record.album_id).maybeSingle();
          entityTitle = a?.title ?? '';
          entityNoun = 'álbum';
        }
        const target = `tu ${entityNoun}${entityTitle ? ` "${entityTitle}"` : ''}`;

        if (record.type === 'reaction') {
          title = 'Nueva reacción';
          body = record.content || `${actorName} ha reaccionado a ${target}`;
        } else if (record.type === 'comment') {
          title = 'Nuevo comentario';
          body = record.content || `${actorName} ha dejado un comentario en ${target}`;
        } else if (record.type === 'mention') {
          title = 'Nueva mención';
          body = record.content || `${actorName} te ha mencionado en un comentario en ${target}`;
        } else if (record.type === 'bucket_update') {
          title = 'Actualización de tarea';
          body = record.content || `${actorName} actualizó una tarea.`;
        } else if (record.type === 'album_update') {
          title = 'Actualización de álbum';
          body = record.content || `${actorName} actualizó un álbum.`;
        } else if (record.type === 'collaborator_invite') {
          title = 'Invitación de colaborador';
          body = record.content || `${actorName} te ha invitado como colaborador.`;
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
            to: pushToken,
            sound: 'default',
            channelId: 'default',
            title,
            body,
            data: {
              notificationId: record.id,
              bucketId: record.bucket_id,
              albumId: record.album_id,
              commentId: record.comment_id,
              actorId: record.actor_id,
              type: record.type,
            },
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
