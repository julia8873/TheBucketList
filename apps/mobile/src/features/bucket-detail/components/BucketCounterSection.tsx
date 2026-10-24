import React from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { Trash2, Minus, Plus } from 'lucide-react-native';
import { styles } from '../styles/bucket-detail.styles';

export function ProgressBar({ value, total, color, track }: { value: number; total: number; color: string; track: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

interface BucketCounterSectionProps {
  bucket: any;
  canEdit: boolean;
  theme: any;
  removeCounter: () => void;
  handleCounterLabelChange: (text: string) => void;
  handleCounterCountChange: (n: number) => void;
  changeCounter: (delta: number) => void;
  handleCounterTargetChange: (text: string) => void;
  updateCounter: (patch: Record<string, any>) => void;
}

export function BucketCounterSection({
  bucket,
  canEdit,
  theme,
  removeCounter,
  handleCounterLabelChange,
  handleCounterCountChange,
  changeCounter,
  handleCounterTargetChange,
  updateCounter,
}: BucketCounterSectionProps) {
  if (!bucket.counter_enabled && !canEdit) return null;

  return (
    <>
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
          <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
            CONTADOR
          </Typography>
          {bucket.counter_enabled && canEdit && (
            <Pressable
              onPress={removeCounter}
              hitSlop={8}
              accessibilityLabel="Quitar contador"
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                height: 28,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(248,113,113,0.45)',
                backgroundColor: pressed ? 'rgba(248,113,113,0.22)' : 'rgba(248,113,113,0.10)',
              })}
            >
              <Trash2 color="#F87171" size={13} strokeWidth={2.2} />
              <Typography variant="caption" color="#F87171" style={{ fontWeight: '600' }}>
                Quitar
              </Typography>
            </Pressable>
          )}
        </View>

        {bucket.counter_enabled ? (
          <>
            <View
              style={{
                marginTop: 12,
                padding: 16,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                {canEdit ? (
                  <TextInput
                    defaultValue={bucket.counter_label || ''}
                    onChangeText={handleCounterLabelChange}
                    placeholder="¿Qué cuentas?"
                    placeholderTextColor={theme.colors.foregroundMuted}
                    style={{ padding: 0, color: theme.colors.foregroundMuted, marginBottom: 4 }}
                  />
                ) : bucket.counter_label ? (
                  <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginBottom: 4 }}>
                    {bucket.counter_label}
                  </Typography>
                ) : null}

                {canEdit ? (
                  <TextInput
                    defaultValue={String(bucket.counter_count ?? 0)}
                    onChangeText={(text) => {
                      const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                      if (!Number.isNaN(n)) {
                        handleCounterCountChange(n);
                      }
                    }}
                    keyboardType="number-pad"
                    style={{
                      padding: 0,
                      color: theme.colors.foreground,
                      fontFamily: 'PlayfairDisplay_700Bold',
                      fontSize: 32,
                      lineHeight: 38,
                    }}
                  />
                ) : (
                  <Typography variant="h1" color={theme.colors.foreground}>
                    {bucket.counter_count ?? 0}
                  </Typography>
                )}
              </View>

              {canEdit && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => changeCounter(-1)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    }}
                  >
                    <Minus color={theme.colors.foregroundMuted} size={20} strokeWidth={2} />
                  </Pressable>
                  <Pressable
                    onPress={() => changeCounter(1)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: gold[400],
                    }}
                  >
                    <Plus color="#000" size={20} strokeWidth={2.4} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Barra y objetivo */}
            {(bucket.counter_target || canEdit) && (
              <View style={{ marginTop: 16 }}>
                {bucket.counter_target ? (
                  <ProgressBar
                    value={bucket.counter_count ?? 0}
                    total={bucket.counter_target}
                    color={gold[400]}
                    track={theme.colors.border}
                  />
                ) : null}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  <Typography variant="bodySemibold" color={theme.colors.foregroundMuted}>
                    {bucket.counter_target ? `${bucket.counter_count ?? 0} de ${bucket.counter_target}` : 'Sin objetivo'}
                  </Typography>
                  {canEdit && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Typography variant="body" color={theme.colors.foreground}>Objetivo</Typography>
                      <TextInput
                        defaultValue={bucket.counter_target ? String(bucket.counter_target) : ''}
                        onChangeText={handleCounterTargetChange}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={theme.colors.foregroundMuted}
                        style={{
                          minWidth: 56,
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: gold[400],
                          backgroundColor: theme.colors.surface,
                          textAlign: 'center',
                          color: gold[400],
                          fontWeight: 'bold',
                        }}
                      />
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        ) : (
          canEdit ? (
            <Pressable
              onPress={() => void updateCounter({ counter_enabled: true, counter_count: 0 })}
              style={({ pressed }) => ({
                marginTop: 12,
                padding: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: 'rgba(212,168,46,0.35)',
                backgroundColor: pressed ? 'rgba(212,168,46,0.14)' : 'rgba(212,168,46,0.06)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: gold[400],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus color="#000" size={22} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="bodySemibold" color={gold[400]}>
                  Añadir contador
                </Typography>
                <Typography variant="caption" color={theme.colors.foregroundMuted}>
                  Cuenta repeticiones, kilómetros, libros…
                </Typography>
              </View>
            </Pressable>
          ) : null
        )}
      </View>
    </>
  );
}
