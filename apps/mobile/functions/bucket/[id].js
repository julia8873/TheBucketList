export async function onRequest(context) {
  const { request, env, params } = context;
  const bucketId = params.id;
  
  // Basic user agent check to see if it's a bot/crawler
  const userAgent = request.headers.get("User-Agent") || "";
  const isBot = /bot|facebook|twitter|whatsapp|telegram|linkedin|slack/i.test(userAgent);
  
  // If not a bot, let Cloudflare Pages serve the SPA index.html via the _redirects rule
  if (!isBot) {
    return env.ASSETS.fetch(request);
  }

  try {
    // 1. Fetch data from Supabase REST API directly
    const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !anonKey) {
      return new Response("Missing env vars", { status: 500 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/buckets?id=eq.${bucketId}&select=title,description`, {
      headers: {
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
      }
    });

    const data = await response.json();
    const bucket = data && data[0];

    if (!bucket) {
      return new Response("Goal not found", { status: 404 });
    }

    // 2. Return minimal HTML with Open Graph tags
    const title = `${bucket.title} | TheBucketList`;
    const description = bucket.description || "Check out my goal on TheBucketList!";
    const url = request.url;
    // We could fetch a bucket photo if we joined it, for MVP we'll use a generic OG image or skip it
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <meta name="description" content="${description}">
          
          <!-- Open Graph -->
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:url" content="${url}">
          <meta property="og:type" content="website">
          <meta property="og:site_name" content="TheBucketList">
          
          <!-- Twitter -->
          <meta name="twitter:card" content="summary">
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
        </head>
        <body>
          <h1>${title}</h1>
          <p>${description}</p>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  } catch (error) {
    // Fallback to the SPA if something fails
    return env.ASSETS.fetch(request);
  }
}
