/**
 * Extrae y normaliza URLs directas de imágenes, resolviendo enlaces de Google Imágenes,
 * enlaces cortos de redirección (images.app.goo.gl), markdown, HTML y texto enriquecido.
 */

function safeDecode(val: string): string {
  try {
    return decodeURIComponent(val);
  } catch {
    return val;
  }
}

/**
 * Extrae la primera URL válida que se encuentre en un texto (soporta markdown [text](url),
 * etiquetas HTML <img src="...">, o texto con URL incrustada).
 */
export function extractUrlFromText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  let str = text.trim();

  // Si ya es un data URI en base64
  if (str.startsWith('data:image/')) return str;

  // Eliminar comillas envolventes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // 1. Sintaxis Markdown de imagen: ![alt](url)
  const mdImg = str.match(/!\[.*?\]\((https?:\/\/[^\s\)"']+)\)/i);
  if (mdImg && mdImg[1]) return mdImg[1];

  // 2. Sintaxis Markdown de enlace: [title](url)
  const mdLink = str.match(/\[.*?\]\((https?:\/\/[^\s\)"']+)\)/i);
  if (mdLink && mdLink[1]) return mdLink[1];

  // 3. Etiqueta HTML img: <img ... src="url" ...>
  const htmlImg = str.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (htmlImg && htmlImg[1]) return htmlImg[1];

  // 4. Etiqueta HTML a: <a ... href="url" ...>
  const htmlA = str.match(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/i);
  if (htmlA && htmlA[1]) return htmlA[1];

  // 5. URL cruda en cualquier parte del texto
  const rawMatch = str.match(/(https?:\/\/[^\s"'<>\(\)\[\]]+)/i);
  if (rawMatch && rawMatch[1]) {
    let clean = rawMatch[1];
    // Eliminar puntuación final accidental como .,;:!?)>
    clean = clean.replace(/[\.,;:!\?\)>]+$/, '');
    return clean;
  }

  return str;
}

/**
 * Determina si una URL apunta directamente a un archivo de imagen estático o CDN conocido.
 */
export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  const clean = (url.split('?')[0] ?? '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(clean)) return true;
  if (url.includes('encrypted-tbn0.gstatic.com')) return true;
  if (url.includes('googleusercontent.com')) return true;
  if (url.includes('images.unsplash.com')) return true;
  if (url.includes('cdn.pixabay.com')) return true;
  if (url.includes('pexels.com')) return true;
  return false;
}

/**
 * Resuelve sincrónicamente URLs conocidas de Google Imágenes y redirecciones extrayendo
 * el parámetro correspondiente (imgurl, url, q, etc.).
 */
export function resolveImageUrl(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';

  const clean = extractUrlFromText(rawInput);
  if (clean.startsWith('data:image/')) return clean;
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return clean;
  }

  try {
    const urlObj = new URL(clean);

    // 1. Caso Google Imágenes / Google Search con imgurl
    if (urlObj.searchParams.has('imgurl')) {
      const extracted = urlObj.searchParams.get('imgurl');
      if (extracted && (extracted.startsWith('http://') || extracted.startsWith('https://'))) {
        return resolveImageUrl(safeDecode(extracted));
      }
    }

    // 2. Parámetros de redirección de Google (/url?q=... o /url?url=...)
    if (urlObj.hostname.includes('google.')) {
      if (urlObj.searchParams.has('url')) {
        const extracted = urlObj.searchParams.get('url');
        if (extracted && (extracted.startsWith('http://') || extracted.startsWith('https://'))) {
          return resolveImageUrl(safeDecode(extracted));
        }
      }
      if (urlObj.searchParams.has('q')) {
        const extracted = urlObj.searchParams.get('q');
        if (extracted && (extracted.startsWith('http://') || extracted.startsWith('https://'))) {
          return resolveImageUrl(safeDecode(extracted));
        }
      }
    }

    // 3. Parámetros habituales en buscadores y redirecciones
    const candidateParams = ['image_url', 'imageUrl', 'mediaurl', 'src', 'img_url', 'picture', 'photo', 'orig'];
    for (const param of candidateParams) {
      if (urlObj.searchParams.has(param)) {
        const extracted = urlObj.searchParams.get(param);
        if (extracted && (extracted.startsWith('http://') || extracted.startsWith('https://'))) {
          return resolveImageUrl(safeDecode(extracted));
        }
      }
    }

    return clean;
  } catch {
    return clean;
  }
}

/**
 * Resuelve de forma asíncrona redirecciones complejas (ej. enlaces cortos images.app.goo.gl)
 * o páginas HTML para obtener la imagen real mediante og:image o imgurl.
 */
export async function resolveImageUrlAsync(rawInput: string): Promise<string> {
  const sync = resolveImageUrl(rawInput);
  if (!sync) return '';

  // Si ya es data URI o URL directa de imagen, no hace falta red
  if (isDirectImageUrl(sync)) {
    return sync;
  }

  // Si es un enlace de Google corto (images.app.goo.gl) o requiere resolver redirección
  if (sync.includes('goo.gl') || sync.includes('google.') || !isDirectImageUrl(sync)) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(sync, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Comprobar la URL final tras la redirección
      const finalUrl = res.url;
      const resolvedFromFinal = resolveImageUrl(finalUrl);
      if (resolvedFromFinal !== finalUrl && isValidWebUrl(resolvedFromFinal)) {
        return resolvedFromFinal;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.startsWith('image/')) {
        return finalUrl;
      }

      // Si devolvió una página HTML, buscar og:image o imgurl
      const htmlText = await res.text();

      // Buscar imgurl= dentro del HTML/JS de Google
      const imgurlMatch = htmlText.match(/imgurl=([^&"'\s<>]+)/i);
      if (imgurlMatch && imgurlMatch[1]) {
        const decoded = safeDecode(safeDecode(imgurlMatch[1]));
        if (isValidWebUrl(decoded)) return decoded;
      }

      // Buscar <meta property="og:image" content="...">
      const ogMatch =
        htmlText.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (ogMatch && ogMatch[1] && isValidWebUrl(ogMatch[1])) {
        return ogMatch[1];
      }

      // Buscar <meta name="twitter:image" content="...">
      const twMatch =
        htmlText.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        htmlText.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      if (twMatch && twMatch[1] && isValidWebUrl(twMatch[1])) {
        return twMatch[1];
      }
    } catch {
      // En caso de error de red o timeout, usamos la resolución síncrona
    }
  }

  return sync;
}

/**
 * Valida si un texto introducido tiene estructura básica de URL web http(s).
 */
export function isValidWebUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Valida si una cadena es una imagen válida (URL web o data URI base64).
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:image/')) return true;
  return isValidWebUrl(trimmed);
}
