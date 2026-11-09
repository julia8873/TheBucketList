export async function onRequest(context) {
  const { request, env, params } = context;
  const bucketId = params.id;
  const url = new URL(request.url);

  // 1. Obtener parámetros directos si fueron provistos por la app (evita problemas de RLS en tareas privadas)
  const qTitle = url.searchParams.get("t");
  const qImg = url.searchParams.get("img");
  const qLoc = url.searchParams.get("loc");
  const qUser = url.searchParams.get("u");

  let title = qTitle ? decodeURIComponent(qTitle) : null;
  let imageUrl = qImg ? decodeURIComponent(qImg) : null;
  let locationText = qLoc ? decodeURIComponent(qLoc) : null;
  let username = qUser ? decodeURIComponent(qUser) : null;
  let description = null;

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const pageUrl = `${siteUrl}/bucket/${bucketId}`;

  // 2. Si no vienen todos los parámetros, consultar Supabase
  if (!title || !imageUrl) {
    try {
      const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co';
      const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';

      const response = await fetch(
        `${supabaseUrl}/rest/v1/buckets?id=eq.${bucketId}&select=title,description,location_text,cover_image,thumbnail_photo_id,profiles(username,display_name),bucket_photos(id,storage_path,thumb_path,created_at)&limit=1`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      const data = await response.json();
      const bucket = data && data[0];

      if (bucket) {
        if (!title) title = bucket.title;
        if (!description && bucket.description) description = bucket.description.trim();
        if (!locationText && bucket.location_text) locationText = bucket.location_text;
        if (!username && bucket.profiles?.username) username = bucket.profiles.username;

        if (!imageUrl) {
          const photos = bucket.bucket_photos || [];
          if (photos.length > 0) {
            let chosen = null;
            if (bucket.thumbnail_photo_id) {
              chosen = photos.find((p) => p.id === bucket.thumbnail_photo_id);
            }
            if (!chosen) {
              chosen = [...photos].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
            }
            const path = chosen?.thumb_path || chosen?.storage_path;
            if (path) {
              imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${path}`;
            }
          } else if (bucket.cover_image && !bucket.cover_image.startsWith('preset:') && !bucket.cover_image.startsWith('#')) {
            imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${bucket.cover_image}`;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching bucket preview:", e);
    }
  }

  // Fallbacks
  if (!title) title = "Plan en TheBucketList";
  if (!imageUrl) imageUrl = `${siteUrl}/icon.png`;

  const locPrefix = locationText ? `📍 ${locationText}` : '';
  const finalDesc = description
    ? (locPrefix ? `${locPrefix} — ${description}` : description)
    : (locPrefix ? `${locPrefix} • Descubre y comparte planes en TheBucketList` : 'Descubre y comparte planes increíbles en TheBucketList.');

  // Título estilo Instagram: "@usuario en TheBucketList" o "Título | TheBucketList"
  const ogTitle = username
    ? `@${username} en TheBucketList: «${title}»`
    : `«${title}» en TheBucketList`;

  const ogTags = `
    <!-- Open Graph / WhatsApp / Instagram / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="TheBucketList" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(finalDesc)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="600" />
    <meta property="og:image:height" content="600" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@TheBucketList" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(finalDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
`;

  try {
    const assetResponse = await env.ASSETS.fetch(request);
    let html = await assetResponse.text();

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${ogTags}`);
    } else {
      html = `<head>${ogTags}</head>${html}`;
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (err) {
    const fallbackHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ogTitle)}</title>
  ${ogTags}
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p>Redirigiendo a <a href="${pageUrl}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;
    return new Response(fallbackHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

