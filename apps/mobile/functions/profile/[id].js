export async function onRequest(context) {
  const { request, env, params } = context;
  const userIdentifier = params.id;

  // Detectar si la petición viene de un bot / rastreador de enlaces (WhatsApp, Facebook, Telegram, Twitter, LinkedIn, etc.)
  const userAgent = request.headers.get("User-Agent") || "";
  const isBot = /bot|facebookexternalhit|whatsapp|telegram|twitter|linkedin|slack|discord|pinterest/i.test(userAgent);

  // Si no es un bot, dejar que Cloudflare Pages sirva la SPA normal
  if (!isBot) {
    return env.ASSETS.fetch(request);
  }

  try {
    const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co';
    const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdentifier);
    const filter = isUuid ? `id=eq.${userIdentifier}` : `username=eq.${userIdentifier}`;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?${filter}&select=id,username,display_name,avatar_url,bio&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    const data = await response.json();
    const profile = data && data[0];

    if (!profile) {
      return env.ASSETS.fetch(request);
    }

    const name = profile.display_name || profile.username;
    const title = `${name} (@${profile.username}) | TheBucketList`;
    const description = profile.bio ? profile.bio.trim() : `Sigue a ${name} en TheBucketList para descubrir su lista de deseos y momentos.`;
    const siteUrl = 'https://thebucketlist-8zk.pages.dev';
    const pageUrl = `${siteUrl}/profile/${profile.id}`;

    let imageUrl = `${siteUrl}/icon.png`;
    if (profile.avatar_url) {
      if (profile.avatar_url.startsWith('http://') || profile.avatar_url.startsWith('https://')) {
        imageUrl = profile.avatar_url;
      } else {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${profile.avatar_url}`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="profile">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:site_name" content="TheBucketList">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">

    <!-- Redirección para clientes que abran en navegador -->
    <meta http-equiv="refresh" content="0;url=${pageUrl}">
  </head>
  <body>
    <h1>${title}</h1>
    <p>${description}</p>
    <img src="${imageUrl}" alt="${title}">
  </body>
</html>`;

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    return env.ASSETS.fetch(request);
  }
}

