import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/album-form.styles';

export function SectionTitle({ highlight, rest }: { highlight: string; rest: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitleHighlight}>{highlight}</Text>
      <Text style={styles.sectionTitleRest}>{rest}</Text>
    </View>
  );
}
