import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';

// El enrutamiento global (sesión, onboarding, splash) lo gestiona RootNavigator en app/_layout.tsx.
export default function Index() {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={gold[400]} />
    </View>
  );
}
