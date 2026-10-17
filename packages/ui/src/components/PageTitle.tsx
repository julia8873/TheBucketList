import React from 'react';
import { Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { fontFamily } from '../tokens/typography';
import { useTheme } from '../theme/useTheme';

export interface PageTitleProps {
  /** First word/words to highlight in gold. If omitted and children is a string, the first word is highlighted automatically */
  gold?: string;
  /** Rest of the title in text color */
  rest?: string;
  /** Children text (e.g. "Momentos de amigos" -> "Momentos" in gold, " de amigos" in text color) */
  children?: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function PageTitle({ gold: goldProp, rest: restProp, children, style, numberOfLines }: PageTitleProps) {
  const { theme } = useTheme();
  const textColor = theme.colors.foreground;
  const goldColor = theme.colors.primary;

  if (goldProp !== undefined) {
    return (
      <Text style={[styles.title, { color: textColor }, style]} numberOfLines={numberOfLines} accessibilityRole="header">
        <Text style={{ color: goldColor }}>{goldProp}</Text>
        {restProp ? <Text style={{ color: textColor }}>{restProp.startsWith(' ') ? restProp : ` ${restProp}`}</Text> : null}
      </Text>
    );
  }

  if (typeof children === 'string') {
    const trimmed = children.trim();
    const spaceIndex = trimmed.indexOf(' ');
    if (spaceIndex !== -1) {
      const firstWord = trimmed.slice(0, spaceIndex);
      const remainder = trimmed.slice(spaceIndex);
      return (
        <Text style={[styles.title, { color: textColor }, style]} numberOfLines={numberOfLines} accessibilityRole="header">
          <Text style={{ color: goldColor }}>{firstWord}</Text>
          <Text style={{ color: textColor }}>{remainder}</Text>
        </Text>
      );
    }
    return (
      <Text style={[styles.title, { color: textColor }, style]} numberOfLines={numberOfLines} accessibilityRole="header">
        <Text style={{ color: goldColor }}>{trimmed}</Text>
      </Text>
    );
  }

  return (
    <Text style={[styles.title, { color: textColor }, style]} numberOfLines={numberOfLines} accessibilityRole="header">
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 26,
    letterSpacing: -0.3,
  },
});

