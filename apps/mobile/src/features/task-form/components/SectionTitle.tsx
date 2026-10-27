import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/task-form.styles';

interface SectionTitleProps {
  highlight: string;
  rest?: string;
}

export function SectionTitle({ highlight, rest = '' }: SectionTitleProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleHighlight}>{highlight}</Text>
      {Boolean(rest) && (
        <Text style={[styles.sectionTitleRest, { color: theme.colors.foreground }]}>
          {rest.startsWith(' ') ? rest : ` ${rest}`}
        </Text>
      )}
    </View>
  );
}
