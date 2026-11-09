export async function onRequest(context) {
  const { request, env, params } = context;
  const profileId = params.id;
  const url = new URL(request.url);

  const qName = url.searchParams.get("name");
  const qUser = url.searchParams.get("u");
  const qAvatar = url.searchParams.get("img");

  let displayName = qName ? decodeURIComponent(qName) : null;
  let username = qUser ? decodeURIComponent(qUser) : null;
  let avatarUrl = qAvatar ? decodeURIComponent(qAvatar) : null;
  let bio = null;

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const pageUrl = `${siteUrl}/profile/${profileId}`;

  if (!username || !avatarUrl) {
    try {
      const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co';
      const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';

      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${profileId}&select=username,display_name,bio,avatar_url&limit=1`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
        }
      );

      const data = await response.json();
      const prof = data && data[0];

      if (prof) {
        if (!username) username = prof.username;
        if (!displayName) displayName = prof.display_name || prof.username;
        if (!bio && prof.bio) bio = prof.bio.trim();
        if (!avatarUrl && prof.avatar_url) avatarUrl = prof.avatar_url;
      }
    } catch (e) {
      console.error("Error fetching profile preview:", e);
    }
  }

  const shownName = displayName || username || "Usuario";
  // EXACTAMENTE estilo Instagram: "@username en TheBucketList"
  const ogTitle = username
    ? `@${username} en TheBucketList`
    : `${shownName} en TheBucketList`;

  const finalDesc = bio
    ? `${bio} • ¡Sigue sus planes y aventuras en TheBucketList!`
    : `¡Descubre la lista de deseos y aventuras de @${username || shownName} en TheBucketList!`;

  const finalAvatar = avatarUrl || `${siteUrl}/icon.png`;

  const ogTags = `
    <!-- Open Graph / WhatsApp / Instagram / Facebook -->
    <meta property="og:type" content="profile" />
    <meta property="og:site_name" content="TheBucketList" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(ogTitle)}" />
    <meta property="og:description" content="${escapeHtml(finalDesc)}" />
    <meta property="og:image" content="${escapeHtml(finalAvatar)}" />
    <meta property="og:image:secure_url" content="${escapeHtml(finalAvatar)}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="600" />
    <meta property="og:image:height" content="600" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:site" content="@TheBucketList" />
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(finalDesc)}" />
    <meta name="twitter:image" content="${escapeHtml(finalAvatar)}" />
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
  <p>Redirigiendo a <a href="${pageUrl}">@${escapeHtml(username || shownName)}</a>...</p>
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

