export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const rawId = params?.id;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const profileId = String(Array.isArray(rawId) ? rawId[0] : (rawId || pathParts[1] || '')).trim();

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const pageUrl = `${siteUrl}/profile/${profileId}`;

  let username = "";
  let displayName = "";
  let avatarUrl = `${siteUrl}/icon.png`;
  let bio = "";

  try {
    const supabaseUrl = (env?.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co').trim();
    const anonKey = (env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM').trim();

    if (profileId) {
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_share_preview`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_type: 'profile',
          p_id: profileId,
        }),
      });

      if (rpcResponse.ok) {
        const data = await rpcResponse.json();
        if (data) {
          username = data.username || '';
          displayName = data.title || data.username || '';
          bio = data.description || '';
          if (data.avatar_url) {
            avatarUrl = data.avatar_url;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error in get_share_preview for profile:", e);
  }

  const shownName = displayName || username || "Usuario";

  // Título en negrita arriba (og:title), y @usuario en TheBucketList abajo (og:description)
  const ogTitle = shownName;
  const authorLine = username ? `@${username} en TheBucketList` : `${shownName} en TheBucketList`;
  const ogDesc = bio
    ? `${authorLine} • ${bio}`
    : `${authorLine} • Descubre su lista de deseos y aventuras`;

  const ogImageUrl = profileId ? `${siteUrl}/preview-image/${profileId}.jpg` : `${siteUrl}/icon.png`;

  const ogTags = `
    <!-- Open Graph / WhatsApp / Instagram / Facebook -->
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="TheBucketList" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(ogDesc)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@TheBucketList" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(ogDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
`;

  const userAgent = request.headers.get('user-agent') || '';
  const isCrawler = /facebookexternalhit|Facebot|WhatsApp|Twitterbot|Pinterest|TelegramBot|Slackbot|LinkedInBot|Discordbot|SkypeUriPreview/i.test(userAgent);

  if (isCrawler) {
    const crawlerHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(ogTitle)}</title>
  ${ogTags}
</head>
<body>
  <h1>${escapeHtml(ogTitle)}</h1>
  <p>${escapeHtml(ogDesc)}</p>
  <img src="${escapeHtml(ogImageUrl)}" alt="${escapeHtml(ogTitle)}" />
</body>
</html>`;

    return new Response(crawlerHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=3600",
        "x-profile-id": profileId,
        "x-crawler": "true",
      },
    });
  }

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
        "x-profile-id": profileId,
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
  <p>Redirigiendo a <a href="${pageUrl}">${escapeHtml(shownName)}</a>...</p>
</body>
</html>`;
    return new Response(fallbackHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-profile-id": profileId,
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
    .replace(/'/g, '&#039;');
}
