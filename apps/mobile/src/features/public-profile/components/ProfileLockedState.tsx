import React from 'react';
import { View, Text } from 'react-native';
import { Lock } from 'lucide-react-native';
import { gold } from '@bucketlist/ui';
import { displayNameOf } from '../../../utils/initials';
import { styles } from '../styles/profile.styles';

interface ProfileLockedStateProps {
  profile: any;
  followStatus: 'none' | 'pending' | 'accepted';
}

export function ProfileLockedState({
  profile,
  followStatus,
}: ProfileLockedStateProps) {
  return (
    <View style={styles.locked}>
      <Lock size={28} color={gold[400]} strokeWidth={1.6} />
      <Text style={styles.lockedTitle}>Esta cuenta es privada</Text>
      <Text style={styles.lockedText}>
        {followStatus === 'pending'
          ? 'Tu solicitud está pendiente. Verás sus tareas cuando la acepte.'
          : `Solicita seguir a ${displayNameOf(profile)} para ver sus tareas.`}
      </Text>
    </View>
  );
}
