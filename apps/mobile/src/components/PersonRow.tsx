import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, fontFamily } from '@bucketlist/ui';
import { displayNameOf, initialsOf } from '../utils/initials';

interface PersonRowProps {
  person: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  /** Segunda línea: "@usuario · 14 tareas públicas". */
  subtitle: string;
  /** Contenido de la derecha (botones). */
  right?: React.ReactNode;
  onPress?: () => void;
}

/** Fila de persona: avatar con aro dorado, nombre, subtítulo y acciones. */
export function PersonRow({ person, subtitle, right, onPress }: PersonRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.8 } : null]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={displayNameOf(person)}
    >
      <Avatar uri={person.avatar_url} initials={initialsOf(person)} size="lg" goldRing />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {displayNameOf(person)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2A',
  },
  text: { flex: 1, gap: 2 },
  name: { fontFamily: fontFamily.semibold, fontSize: 16, color: '#FFFFFF' },
  subtitle: { fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: '#9A9A9A' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
