export async function onRequest(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);

  const rawId = params?.id;
  const pathParts = url.pathname.split('/').filter(Boolean);
  const bucketId = String(Array.isArray(rawId) ? rawId[0] : (rawId || pathParts[1] || '')).trim();

  const siteUrl = 'https://thebucketlist-8zk.pages.dev';
  const pageUrl = `${siteUrl}/bucket/${bucketId}`;

  let title = "Plan en TheBucketList";
  let locationText = "";
  let username = "";
  let description = "";
  let debugRpc = "not_called";

  try {
    const supabaseUrl = (env?.EXPO_PUBLIC_SUPABASE_URL || 'https://fazxqjznuehrwkungmjm.supabase.co').trim();
    const anonKey = (env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM').trim();

    if (bucketId) {
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/get_share_preview`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_type: 'bucket',
          p_id: bucketId,
        }),
      });

      if (rpcResponse.ok) {
        const data = await rpcResponse.json();
        debugRpc = `ok_${data?.title || 'notitle'}`;
        if (data && data.title) {
          title = data.title;
          description = data.description || '';
          locationText = data.location || '';
          username = data.creator_username || '';
        }
      } else {
        const errText = await rpcResponse.text();
        debugRpc = `err_${rpcResponse.status}_${errText.slice(0, 60)}`;
      }
    } else {
      debugRpc = "empty_id";
    }
  } catch (e) {
    debugRpc = `catch_${String(e?.message || e).slice(0, 60)}`;
  }

  const locPrefix = locationText ? `📍 ${locationText}` : '';

  // Título en negrita arriba (og:title), y autor en TheBucketList abajo (og:description)
  const ogTitle = title || 'TheBucketList';

  const authorLine = username
    ? `@${username} en TheBucketList`
    : 'TheBucketList';

  const extraParts = [];
  if (locPrefix) extraParts.push(locPrefix);
  if (description) extraParts.push(description);

  const ogDesc = extraParts.length > 0
    ? `${authorLine} • ${extraParts.join(' — ')}`
    : authorLine;

  const ogImageUrl = bucketId ? `${siteUrl}/preview-image/${bucketId}.jpg` : `${siteUrl}/icon.png`;

  const ogTags = `
    <!-- Open Graph / WhatsApp / Instagram / Facebook -->
    <meta property="og:type" content="article" />
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

  // Para rastreadores (WhatsApp, Facebook, etc.): devolver solo metadatos ultraligeros
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
        "x-bucket-id": bucketId,
        "x-debug-rpc": debugRpc,
        "x-crawler": "true",
      },
    });
  }

  // Rutas de deep linking nativo y Play Store
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.thebucketlist.app';
  const appSchemeUrl = `bucketlist://bucket/${bucketId}`;
  const androidIntentUrl = `intent://bucket/${bucketId}#Intent;scheme=bucketlist;package=com.thebucketlist.app;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;

  // Script y banner para redirigir/abrir directamente la app instalada en móviles (o Play Store si no está instalada)
  const deepLinkInjection = `
    ${ogTags}
    <script>
      (function() {
        var isAndroid = /Android/i.test(navigator.userAgent);
        var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (sessionStorage.getItem('tbl_banner_dismissed') === '1') return;
        if (isAndroid) {
          try {
            window.location.href = "${androidIntentUrl}";
          } catch (e) {}
        } else if (isIOS) {
          try {
            window.location.href = "${appSchemeUrl}";
          } catch (e) {}
        }
      })();
    </script>
  `;

  const bannerHtml = `
    <div id="tbl-app-banner" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:999999;width:calc(100% - 24px);max-width:400px;background:#18181b;border:1.5px solid #D4B13A;box-shadow:0 16px 36px rgba(0,0,0,0.85);border-radius:20px;padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="/icon.png" style="width:42px;height:42px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.4);" />
          <div>
            <div style="color:#ffffff;font-size:14px;font-weight:700;display:flex;align-items:center;gap:6px;">
              TheBucketList
              <span style="background:rgba(212,177,58,0.2);color:#D4B13A;font-size:10px;font-weight:700;padding:2px 5px;border-radius:5px;border:1px solid rgba(212,177,58,0.35);">APP</span>
            </div>
            <div style="color:#a1a1aa;font-size:12px;margin-top:2px;">Disponible en Google Play</div>
          </div>
        </div>
        <button onclick="document.getElementById('tbl-app-banner').style.display='none';sessionStorage.setItem('tbl_banner_dismissed','1');" style="background:none;border:none;color:#71717a;font-size:22px;line-height:1;cursor:pointer;padding:4px;" aria-label="Cerrar">×</button>
      </div>

      <p style="color:#d4d4d8;font-size:12.5px;line-height:1.4;margin:0 0 12px 0;">
        Abre o descarga la app para guardar esta tarea en tu lista, ver fotos en alta calidad y conectar con amigos.
      </p>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <a id="tbl-open-btn" href="${androidIntentUrl}" style="background:#D4B13A;color:#000000;font-weight:700;font-size:13.5px;padding:11px;border-radius:12px;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 3px 12px rgba(212,177,58,0.35);">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.609 1.814L13.792 12 3.61 22.186a2.404 2.404 0 0 1-.22-.387V2.2c.068-.138.143-.267.22-.387zm11.235 11.236l2.164-2.165-9.664-5.58 7.5 7.745zm0 1.898l-7.5 7.746 9.664-5.58-2.164-2.166zm3.265-2.22l2.67-1.542a1.442 1.442 0 0 0 0-2.372l-2.67-1.542-2.316 2.316 2.316 2.14z"/>
          </svg>
          Abrir o Instalar en Google Play
        </a>

        <button onclick="document.getElementById('tbl-app-banner').style.display='none';sessionStorage.setItem('tbl_banner_dismissed','1');" style="background:transparent;border:1px solid #3f3f46;color:#a1a1aa;font-size:12px;font-weight:600;padding:8px;border-radius:10px;cursor:pointer;">
          Continuar viendo en la versión web
        </button>
      </div>
    </div>
    <script>
      (function() {
        var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS) {
          var btn = document.getElementById('tbl-open-btn');
          if (btn) btn.href = "${appSchemeUrl}";
        }
      })();
    </script>
  `;

  try {
    const assetResponse = await env.ASSETS.fetch(request);
    let html = await assetResponse.text();

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${deepLinkInjection}`);
    } else {
      html = `<head>${deepLinkInjection}</head>${html}`;
    }

    if (html.includes('</body>')) {
      html = html.replace('</body>', `${bannerHtml}</body>`);
    } else {
      html = `${html}${bannerHtml}`;
    }

    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-bucket-id": bucketId,
        "x-debug-rpc": debugRpc,
      },
    });
  } catch (err) {
    const fallbackHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(ogTitle)}</title>
  ${deepLinkInjection}
</head>
<body style="background:#0F0F0F;color:#FFF;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:20px;text-align:center;">
  <div style="max-width:340px;">
    <img src="/icon.png" style="width:72px;height:72px;border-radius:18px;margin-bottom:16px;" />
    <h2 style="font-size:20px;margin-bottom:8px;">${escapeHtml(ogTitle)}</h2>
    <p style="color:#aaa;font-size:14px;margin-bottom:24px;">${escapeHtml(ogDesc)}</p>
    <a href="${androidIntentUrl}" id="tbl-fallback-btn" style="background:#D4B13A;color:#000;font-weight:700;font-size:14px;padding:12px 24px;border-radius:24px;text-decoration:none;display:inline-block;margin-bottom:12px;box-shadow:0 3px 12px rgba(212,177,58,0.35);">
      Abrir o Descargar en Google Play
    </a>
    <div>
      <a href="${pageUrl}" style="color:#a1a1aa;font-size:13px;text-decoration:underline;">Ver en la versión web</a>
    </div>
  </div>
  <script>
    (function() {
      var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIOS) {
        var btn = document.getElementById('tbl-fallback-btn');
        if (btn) btn.href = "${appSchemeUrl}";
      }
    })();
  </script>
</body>
</html>`;

    return new Response(fallbackHtml, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
        "x-bucket-id": bucketId,
        "x-debug-rpc": debugRpc,
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
