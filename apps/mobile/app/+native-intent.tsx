/**
 * Intercepta los deep links ANTES de que Expo Router los convierta en navegación.
 *
 * Problema: al volver de Google, Supabase redirige a `bucketlist://login#access_token=…`
 * (o `…://register#…`). Expo Router trataba ese enlace como una ruta más y navegaba
 * (recreando la pantalla inicial, abriendo "elige tu usuario" en segundo plano, etc.).
 *
 * Los tokens ya los recoge `WebBrowser.openAuthSessionAsync` en `useGoogleAuth`,
 * así que aquí simplemente ignoramos esos enlaces: la pantalla actual NO cambia.
 */
const OAUTH_CALLBACK_RE =
  /(?:^|\/)(?:login|register)\/?(?:[?#]|$)[^]*?(?:access_token=|refresh_token=|code=|error=|error_description=)/i;

export function isOAuthCallback(path: string): boolean {
  return OAUTH_CALLBACK_RE.test(path);
}

export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  if (isOAuthCallback(path)) {
    // Arranque en frío por el callback: ir a la raíz (Index decide el destino correcto).
    // Con la app ya abierta: cadena vacía = enlace ignorado, sin navegar.
    return initial ? '/' : '';
  }
  return path;
}
