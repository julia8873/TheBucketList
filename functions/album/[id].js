export async function onRequest(context) {
  const { request, env, params } = context;
  const albumId = params.id;
  const url = new URL(request.url);

  const qTitle = url.searchParams.get("t");
  const qImg = url.searchParams.get("img");
  const qUser = url.searchParams.get("u");

  let title = qTitle ? decodeURIComponent(qTitle) : null;
  let imageUrl = qImg ? decodeURIComponent(qImg) : null;
  let username = qUser ? decodeURIComponent(qUser) : null;
  let description = null;

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const pageUrl = `${siteUrl}/album/${albumId}`;

  if (!title || !imageUrl) {
    try {
      const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co';
      const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';

      const response = await fetch(
        `${supabaseUrl}/rest/v1/albums?id=eq.${albumId}&select=title,description,cover_image,profiles!owner_id(username,display_name)&limit=1`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      const data = await response.json();
      const album = data && data[0];

      if (album) {
        if (!title) title = album.title;
        if (!description && album.description) description = album.description.trim();
        if (!username && album.profiles?.username) username = album.profiles.username;

        if (!imageUrl && album.cover_image && !album.cover_image.startsWith('preset:') && !album.cover_image.startsWith('#')) {
          imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${album.cover_image}`;
        }
      }
    } catch (e) {
      console.error("Error fetching album preview:", e);
    }
  }

  if (!title) title = "Álbum en TheBucketList";
  if (!imageUrl) imageUrl = `${siteUrl}/icon.png`;

  const finalDesc = description
    ? description
    : 'Colección de planes y momentos increíbles en TheBucketList.';

  const ogTitle = username
    ? `@${username} en TheBucketList: Álbum «${title}»`
    : `Álbum «${title}» en TheBucketList`;

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

