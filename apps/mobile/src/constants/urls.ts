import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { makeRedirectUri } from 'expo-auth-session';

/** APP_ENV: 'local' | 'staging' | 'prod' */
const APP_ENV =
  process.env['EXPO_PUBLIC_APP_ENV'] ??
  (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ??
  process.env['APP_ENV'] ??
  'local';

function getHostIp(): string | undefined {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') return ip;
  }
  const linkingUri = Constants.linkingUri;
  if (linkingUri) {
    const match = linkingUri.match(/\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Supabase URL — varies by environment AND platform.
 * Inside the Android emulator, `localhost` resolves to the emulator itself,
 * so we use `10.0.2.2` to reach the host machine.
 */
export function getSupabaseUrl(): string {
  if (APP_ENV === 'prod') {
    return process.env['EXPO_PUBLIC_SUPABASE_URL_PROD'] || process.env['EXPO_PUBLIC_SUPABASE_URL'] || '';
  }
  if (APP_ENV === 'staging') {
    return process.env['EXPO_PUBLIC_SUPABASE_URL_STAGING'] || process.env['EXPO_PUBLIC_SUPABASE_URL'] || '';
  }

  // Web check: if running on web and EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL_PROD is provided,
  // or running in a deployed browser (not localhost), use production/configured URL
  if (Platform.OS === 'web') {
    if (process.env['EXPO_PUBLIC_SUPABASE_URL']) {
      return process.env['EXPO_PUBLIC_SUPABASE_URL'];
    }
    if (process.env['EXPO_PUBLIC_SUPABASE_URL_PROD']) {
      return process.env['EXPO_PUBLIC_SUPABASE_URL_PROD'];
    }
    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://fazxqjznuehrwkungmjm.supabase.co';
    }
    return 'http://127.0.0.1:54321';
  }

  // local
  if (Device.isDevice) {
    const dynamicHost = getHostIp();
    if (dynamicHost) {
      return `http://${dynamicHost}:54321`;
    }
    const configuredLocal = process.env['EXPO_PUBLIC_SUPABASE_URL_LOCAL'];
    if (configuredLocal && !configuredLocal.includes('127.0.0.1') && !configuredLocal.includes('localhost')) {
      return configuredLocal;
    }
    return 'http://192.168.18.42:54321';
  }

  if (Platform.OS === 'android') {
    return process.env['EXPO_PUBLIC_SUPABASE_URL_EMULATOR'] ?? 'http://10.0.2.2:54321';
  }

  return process.env['EXPO_PUBLIC_SUPABASE_URL_LOCAL'] ?? 'http://127.0.0.1:54321';
}

export function getSupabaseAnonKey(): string {
  if (APP_ENV === 'prod') {
    return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD'] || process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || '';
  }
  if (APP_ENV === 'staging') {
    return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING'] || process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || '';
  }
  if (Platform.OS === 'web') {
    if (process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY']) {
      return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];
    }
    if (process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD']) {
      return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD'];
    }
    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhenhxanpudWVocndrdW5nbWptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MzE5NDEsImV4cCI6MjEwNzMwNzk0MX0.1i4vocM3OAet2tzm3hLJYy-RcV03XuIPbZDdlKNTtlM';
    }
  }
  const k = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL'];
  if (k && !k.includes('CRFA0NiK')) {
    return k;
  }
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
}

/**
 * Reescribe una URL pública de Supabase Storage al host del entorno actual.
 * Las URLs guardadas en la BD pueden llevar el host de quien subió el archivo
 * (IP local, 10.0.2.2, 127.0.0.1...), que otros usuarios no pueden alcanzar.
 * La ruta `/storage/v1/object/public/<bucket>/<path>` es siempre la misma.
 */
export function normalizeStorageUrl<T extends string | null | undefined>(url: T): T {
  if (!url || typeof url !== 'string') return url;
  const marker = '/storage/v1/object/public/';
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const base = getSupabaseUrl();
  if (!base) return url;
  // Si la URL ya es HTTPS válida, nunca degradarla a localhost o IP local
  if (url.startsWith('https://') && (base.includes('127.0.0.1') || base.includes('localhost') || base.includes('10.0.2.2') || base.includes('192.168.'))) {
    return url;
  }
  return `${base.replace(/\/$/, '')}${url.slice(i)}` as T;
}

const isExpoGoEnvironment =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * URL a la que Supabase redirige tras verificar el correo / restablecer la contraseña.
 * - Web: origen local en desarrollo (__DEV__) o EXPO_PUBLIC_SITE_URL en producción.
 * - Expo Go: deep link `exp://...` para no activar la app instalada en el dispositivo.
 * - Nativo standalone: deep link `bucketlist://<path>`.
 */
export function getAuthRedirectUrl(path = ''): string {
  const normalizedPath = path.replace(/^\//, '');

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return normalizedPath ? `${window.location.origin}/${normalizedPath}` : window.location.origin;
    }
    const site = process.env['EXPO_PUBLIC_SITE_URL'];
    if (site) {
      return normalizedPath ? `${site.replace(/\/$/, '')}/${normalizedPath}` : site.replace(/\/$/, '');
    }
  }

  // En Expo Go no debemos usar scheme 'bucketlist' porque Android/iOS abrirá la app real instalada
  if (isExpoGoEnvironment) {
    return makeRedirectUri({ path: normalizedPath });
  }

  return `bucketlist://${normalizedPath}`;
}

/** Documentos legales alojados en la web (apps/mobile/public → Cloudflare Pages). */
const LEGAL_SITE_URL = (process.env['EXPO_PUBLIC_SITE_URL'] || 'https://thebucketlist-8zk.pages.dev').replace(/\/$/, '');
export const LEGAL_URLS = {
  privacy: `${LEGAL_SITE_URL}/privacy.html`,
  terms: `${LEGAL_SITE_URL}/terms.html`,
  deleteAccount: `${LEGAL_SITE_URL}/delete-account.html`,
} as const;
