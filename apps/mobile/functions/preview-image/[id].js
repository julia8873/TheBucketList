export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  // Extract clean ID, stripping any extension (.jpg, .png, etc.)
  const rawId = params?.id;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const targetId = String(Array.isArray(rawId) ? rawId[0] : (rawId || pathParts[1] || '')).replace(/\.(jpe?g|png|webp|gif)$/i, '').trim();

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const supabaseUrl = (env?.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co').trim();
  const anonKey = (env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM').trim();

  const directUrl = url.searchParams.get('url');
  let targetImageUrl = directUrl || '';

  if (!targetImageUrl && targetId) {
    try {
      for (const p_type of ['bucket', 'album', 'profile']) {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_share_preview`, {
          method: 'POST',
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_type, p_id: targetId }),
        });

        if (rpcRes.ok) {
          const data = await rpcRes.json();
          if (data) {
            let path = data.photo_path || (data.cover_image && !data.cover_image.startsWith('preset:') && !data.cover_image.startsWith('#') ? data.cover_image : null) || data.avatar_url;
            if (path) {
              if (path.startsWith('http')) {
                targetImageUrl = path;
              } else {
                const cleanPath = path.replace(/_thumb\.jpg$/, '.jpg');
                targetImageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${cleanPath}`;
              }
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Error finding preview image:', e);
    }
  }

  if (!targetImageUrl) {
    targetImageUrl = `${siteUrl}/icon.png`;
  }

  try {
    const upstreamRes = await fetch(targetImageUrl);
    if (!upstreamRes.ok) {
      return Response.redirect(`${siteUrl}/icon.png`, 302);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=604800, s-maxage=604800, immutable',
        'access-control-allow-origin': '*',
        'x-served-by': 'bucketlist-preview-image',
      },
    });
  } catch (err) {
    return Response.redirect(`${siteUrl}/icon.png`, 302);
  }
}

