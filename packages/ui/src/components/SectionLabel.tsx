/**
 * SectionLabel — bicolor section header
 * e.g. "MOMENTOS DE AMIGOS" where the first word is gold + serif
 *      and the rest is white/text + serif
 *
 * Usage: <SectionLabel highlight="MOMENTOS" rest="DE AMIGOS" />
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { fontFamily, fontSize, letterSpacing } from '../tokens/typography';
import { gold } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';

interface SectionLabelProps {
  highlight: string;   // gold word(s)
  rest: string;        // rest in foreground color
  style?: ViewStyle;
}

export function SectionLabel({ highlight, rest, style }: SectionLabelProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.text, { color: gold[400] }]}>
        {highlight}
      </Text>
      <Text style={[styles.text, { color: theme.colors.foreground }]}>
        {' '}{rest}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  text: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize.sm,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase',
  },
});
