import { themedStyleSheet } from '@bucketlist/ui';
import React, { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { normalizeStorageUrl } from '../../constants/urls';
import { Typography, Button, Icon, useTheme, spacing, radii, fontFamily, gold } from '@bucketlist/ui';

// ─── Layout de pantalla ─────────────────────────────────────────────────────

interface AuthScreenProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** 0..1 — barra de progreso del onboarding */
  progress?: number;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

export function AuthScreen({ title, subtitle, onBack, progress, footer, children }: AuthScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[s.flex, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.topRow}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              style={[s.back, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <Icon icon={ChevronLeft} size={20} />
            </Pressable>
          ) : null}
          {progress !== undefined ? (
            <View style={[s.track, { backgroundColor: theme.colors.border }]}>
              <View
                style={[s.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.colors.primary }]}
              />
            </View>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Typography variant="h1" style={s.title}>{title}</Typography>
          {subtitle ? (
            <Typography variant="sm" color={theme.colors.foregroundSubtle}>{subtitle}</Typography>
          ) : null}
          <View style={s.body}>{children}</View>
        </ScrollView>

        {footer ? <View style={s.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Campos ─────────────────────────────────────────────────────────────────

/** "CORREO ELECTRÓNICO" → primera palabra en dorado, el resto en blanco */
export function FieldLabel({ text }: { text: string }) {
  const { theme } = useTheme();
  const [first, ...rest] = text.split(' ');
  return (
    <Text style={[s.label, { color: theme.colors.foreground }]}>
      <Text style={{ color: theme.colors.primary }}>{first}</Text>
      {rest.length ? ` ${rest.join(' ')}` : ''}
    </Text>
  );
}

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  message?: string | null;
  messageTone?: 'ok' | 'error' | 'muted';
  prefix?: string;
  password?: boolean;
}

export const AuthInput = forwardRef<TextInput, AuthInputProps>(function AuthInput(
  { label, error, message, messageTone = 'muted', prefix, password, onFocus, onBlur, ...props },
  ref,
) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const multiline = !!props.multiline;
  const isError = !!error || messageTone === 'error';
  const borderColor = isError
    ? theme.colors.error
    : focused
      ? theme.colors.borderFocus
      : theme.colors.border;
  const msg = error ?? message;
  const msgColor = isError
    ? theme.colors.error
    : messageTone === 'ok'
      ? theme.colors.primary
      : theme.colors.foregroundSubtle;

  return (
    <View style={s.field}>
      <FieldLabel text={label} />
      <View
        style={[
          s.inputRow,
          multiline && s.inputRowMulti,
          { backgroundColor: theme.colors.surface, borderColor, borderWidth: focused ? 1.5 : 1 },
        ]}
      >
        {prefix ? (
          <Text style={[s.prefix, { color: theme.colors.primary }]}>{prefix}</Text>
        ) : null}
        <TextInput
          ref={ref}
          style={[
            s.input,
            multiline && s.inputMulti,
            { color: theme.colors.foreground },
            Platform.OS === 'web' ? ({ outlineWidth: 0 } as object) : null,
          ]}
          placeholderTextColor={theme.colors.foregroundSubtle}
          selectionColor={theme.colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={password ? hidden : false}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button">
            <Text style={[s.toggle, { color: theme.colors.foregroundMuted }]}>
              {hidden ? t('auth.show') : t('auth.hide')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {msg ? <Text style={[s.msg, { color: msgColor }]}>{msg}</Text> : null}
    </View>
  );
});

// ─── Botones ────────────────────────────────────────────────────────────────

export function PillButton({
  title, onPress, loading, disabled,
}: { title: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  return (
    <Button
      title={title}
      size="lg"
      fullWidth
      loading={loading}
      disabled={!!disabled || !!loading}
      onPress={onPress}
      style={s.pill}
    />
  );
}

export function OutlinePillButton({ title, onPress }: { title: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.outline, { borderColor: theme.colors.primary, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[s.outlineText, { color: theme.colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export function GoogleLogo({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export function GoogleButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const isDisabled = !!disabled || !!loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        s.googleBtn,
        {
          backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          borderColor: theme.dark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
          opacity: isDisabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {loading ? (
        <Text style={[s.googleBtnText, { color: theme.colors.foregroundSubtle }]}>…</Text>
      ) : (
        <>
          <GoogleLogo size={18} />
          <Text style={[s.googleBtnText, { color: theme.colors.foreground }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextAction({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} accessibilityRole="button" style={s.textAction}>
      <Text style={[s.textActionLabel, { color: theme.colors.foregroundSubtle }]}>{title}</Text>
    </Pressable>
  );
}

export function OrDivider() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={s.orRow}>
      <View style={[s.line, { backgroundColor: theme.colors.border }]} />
      <Text style={[s.orText, { color: theme.colors.foregroundSubtle }]}>{t('common.or')}</Text>
      <View style={[s.line, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

/** "¿Eres nuevo?  Crear cuenta" */
export function SwitchLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Text style={[s.switchText, { color: theme.colors.foregroundMuted }]}>
      {prompt}{' '}
      <Text onPress={onPress} accessibilityRole="link" style={{ color: theme.colors.primary, fontFamily: fontFamily.semibold }}>
        {action}
      </Text>
    </Text>
  );
}

// ─── Avatar grande con anillo dorado ────────────────────────────────────────

export function BigAvatar({
  uri, initials, size = 110, badge,
}: { uri?: string | null; initials: string; size?: number; badge?: React.ReactNode }) {
  const { theme } = useTheme();
  const inner = size - 6;
  return (
    <View style={{ width: size, height: size }}>
      <View style={[s.ring, { width: size, height: size, borderRadius: size / 2, borderColor: gold[400] }]}>
        {uri ? (
          <Image source={{ uri: normalizeStorageUrl(uri) }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} contentFit="cover" />
        ) : (
          <View
            style={[
              s.avatarFallback,
              { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: '#201B0E' },
            ]}
          >
            <Text
              style={{
                color: theme.colors.primary,
                fontFamily: fontFamily.medium,
                fontSize: Math.round(size * 0.32),
                lineHeight: Math.round(size * 0.38),
                textAlign: 'center',
                textAlignVertical: 'center',
                includeFontPadding: false,
                letterSpacing: -0.5,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {initials}
            </Text>
          </View>
        )}
      </View>
      {badge ? <View style={s.badge}>{badge}</View> : null}
    </View>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const s = themedStyleSheet({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[5], paddingTop: spacing[3], minHeight: 44 },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 3, borderRadius: 2 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[4] },
  title: { marginBottom: spacing[1] },
  body: { marginTop: spacing[6], gap: spacing[4] },
  footer: { paddingHorizontal: spacing[5], paddingBottom: Platform.OS === 'ios' ? 52 : 46, paddingTop: spacing[2], gap: spacing[3] },
  field: { gap: spacing[2] },
  label: { fontFamily: fontFamily.serifBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: spacing[4], borderRadius: radii.full },
  inputRowMulti: { alignItems: 'flex-start', borderRadius: radii.xl, paddingVertical: spacing[2] },
  prefix: { fontFamily: fontFamily.medium, fontSize: 15, marginRight: spacing[2] },
  input: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, paddingVertical: spacing[3] },
  inputMulti: { minHeight: 90, textAlignVertical: 'top' },
  toggle: { fontFamily: fontFamily.medium, fontSize: 12, marginLeft: spacing[2] },
  msg: { fontFamily: fontFamily.regular, fontSize: 12, paddingHorizontal: spacing[1] },
  pill: { borderRadius: radii.full },
  outline: { borderWidth: 1, borderRadius: radii.full, paddingVertical: spacing[4], alignItems: 'center', alignSelf: 'stretch' },
  outlineText: { fontFamily: fontFamily.semibold, fontSize: 17 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    alignSelf: 'center',
    width: '100%',
    maxWidth: 290,
  },
  googleBtnText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    letterSpacing: -0.2,
  },
  textAction: { alignSelf: 'center', paddingVertical: spacing[2] },
  textActionLabel: { fontFamily: fontFamily.medium, fontSize: 15 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: 2 },
  line: { flex: 1, height: 1 },
  orText: { fontFamily: fontFamily.regular, fontSize: 12 },
  switchText: { textAlign: 'center', fontFamily: fontFamily.regular, fontSize: 13, marginTop: 4 },
  ring: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', right: 0, bottom: 0 },
});
