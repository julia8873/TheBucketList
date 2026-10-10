import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

/** APP_ENV: 'local' | 'staging' | 'prod' */
const APP_ENV = (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'local';

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
  if (Platform.OS === 'android') {
    if (!Device.isDevice) {
      return process.env['EXPO_PUBLIC_SUPABASE_URL_EMULATOR'] ?? 'http://10.0.2.2:54321';
    }
    return process.env['EXPO_PUBLIC_SUPABASE_URL_LOCAL'] ?? 'http://192.168.1.73:54321';
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
