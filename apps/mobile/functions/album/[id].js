export async function onRequest(context) {
  const { request, env, params } = context;
  const albumId = params.id;

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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/albums?id=eq.${albumId}&select=title,description,cover_path&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    const data = await response.json();
    const album = data && data[0];

    if (!album) {
      return env.ASSETS.fetch(request);
    }

    const title = `${album.title} | Álbum en TheBucketList`;
    const description = album.description ? album.description.trim() : 'Explora este álbum y sus momentos en TheBucketList.';
    const siteUrl = 'https://thebucketlist-8zk.pages.dev';
    const pageUrl = `${siteUrl}/album/${albumId}`;

    let imageUrl = `${siteUrl}/icon.png`;
    if (album.cover_path) {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${album.cover_path}`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="description" content="${description}">

    <!-- Open Graph / WhatsApp / Facebook -->
    <meta property="og:type" content="website">
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

