export async function onRequest(context) {
  const { request, env, params } = context;
  const bucketId = params.id;

  // Detectar si la petición viene de un bot / rastreador de enlaces (WhatsApp, Facebook, Telegram, Twitter, LinkedIn, etc.)
  const userAgent = request.headers.get("User-Agent") || "";
  const isBot = /bot|facebookexternalhit|whatsapp|telegram|twitter|linkedin|slack|discord|pinterest/i.test(userAgent);

  // Si no es un bot, dejar que Cloudflare Pages sirva la SPA normal (para que el usuario vea la app web)
  if (!isBot) {
    return env.ASSETS.fetch(request);
  }

  try {
    const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co';
    const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';

    const response = await fetch(
      `${supabaseUrl}/rest/v1/buckets?id=eq.${bucketId}&select=title,description,location_text,cover_image,thumbnail_photo_id,bucket_photos(id,storage_path,thumb_path,created_at)&limit=1`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      }
    );

    const data = await response.json();
    const bucket = data && data[0];

    if (!bucket) {
      return env.ASSETS.fetch(request);
    }

    const title = `${bucket.title} | TheBucketList`;
    const loc = bucket.location_text ? `📍 ${bucket.location_text}` : '';
    const descText = bucket.description ? bucket.description.trim() : 'Descubre y comparte planes increíbles en TheBucketList.';
    const description = loc ? `${loc} — ${descText}` : descText;
    const siteUrl = 'https://thebucketlist-8zk.pages.dev';
    const pageUrl = `${siteUrl}/bucket/${bucketId}`;

    // Determinar la imagen para la tarjeta de previsualización (estilo Instagram)
    let imageUrl = `${siteUrl}/icon.png`;
    const photos = bucket.bucket_photos || [];
    if (photos.length > 0) {
      let chosen = null;
      if (bucket.thumbnail_photo_id) {
        chosen = photos.find((p) => p.id === bucket.thumbnail_photo_id);
      }
      if (!chosen) {
        // Ordenar por fecha más reciente
        chosen = [...photos].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
      }
      const path = chosen?.storage_path || chosen?.thumb_path;
      if (path) {
        imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${path}`;
      }
    } else if (bucket.cover_image && !bucket.cover_image.startsWith('preset:') && !bucket.cover_image.startsWith('#')) {
      imageUrl = `${supabaseUrl}/storage/v1/object/public/photos/${bucket.cover_image}`;
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
