import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/** APP_ENV: 'local' | 'staging' | 'prod' */
const APP_ENV = (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'local';

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
    return process.env['EXPO_PUBLIC_SUPABASE_URL_PROD'] ?? '';
  }
  if (APP_ENV === 'staging') {
    return process.env['EXPO_PUBLIC_SUPABASE_URL_STAGING'] ?? '';
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
    return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_PROD'] ?? '';
  }
  if (APP_ENV === 'staging') {
    return process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_STAGING'] ?? '';
  }
  return (
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY_LOCAL'] ??
    // Default Supabase local anon key (safe to commit)
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqd3V4AGSJlZ5V2P8VWv7Tc3KzGgLn9KI'
  );
}
