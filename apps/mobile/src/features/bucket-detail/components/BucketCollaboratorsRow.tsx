import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { normalizeStorageUrl } from '@/constants/urls';
import { styles } from '../styles/bucket-detail.styles';

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface BucketCollaboratorsRowProps {
  bucket: any;
  collaborators: any[];
  participantsData: any[];
  user: any;
  canEdit: boolean;
  onOpenPicker: () => void;
}

export function BucketCollaboratorsRow({
  bucket,
  collaborators,
  participantsData,
  user,
  canEdit,
  onOpenPicker,
}: BucketCollaboratorsRowProps) {
  const isOwnerUser = bucket.user_id === user?.id;
  const ownerEntry = {
    id: bucket.user_id,
    username: bucket.user?.username || (isOwnerUser ? user?.user_metadata?.username || user?.email?.split('@')[0] || '' : ''),
    display_name: bucket.user?.display_name || (isOwnerUser ? user?.user_metadata?.display_name || user?.user_metadata?.full_name || null : null),
    avatar_url: bucket.user?.avatar_url || (isOwnerUser ? user?.user_metadata?.avatar_url || null : null),
    status: 'accepted',
    isOwner: true,
  };

  const visibleCollaborators = collaborators.filter((c: any) => {
    if (c.status === 'accepted') return true;
    if (c.status === 'pending') return canEdit || c.id === user?.id;
    return false;
  });

  const ownerId = bucket.user_id;
  const byId = new Map<string, any>();
  [
    ownerEntry,
    ...participantsData.filter((p: any) => p.id !== ownerId),
    ...visibleCollaborators.filter((c: any) => c.id !== ownerId),
  ].forEach((c: any) => {
    if (!byId.has(c.id)) byId.set(c.id, c);
  });
  const everyone = Array.from(byId.values());
  const hasOtherCollaborators = everyone.some((c: any) => c.id !== user?.id);
  const participants = hasOtherCollaborators ? everyone : [];

  if (participants.length === 0 && !canEdit) return null;

  return (
    <View style={styles.collaboratorsSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collaboratorsRow}
      >
        {participants.map((c: any) => {
          const isPending = c.status === 'pending';
          return (
            <Pressable
              key={c.id}
              onPress={() => canEdit && onOpenPicker()}
              style={[
                styles.collaboratorCircle,
                isPending && styles.collaboratorCirclePending,
                c.isOwner && { borderColor: '#D4B13A', borderWidth: 2.5 },
              ]}
            >
              {c.avatar_url ? (
                <Image
                  source={{ uri: normalizeStorageUrl(c.avatar_url) }}
                  style={[styles.collaboratorAvatarImg, isPending && { opacity: 0.35 }]}
                />
              ) : (
                <Text style={[styles.collaboratorInitials, isPending && { opacity: 0.35 }]}>
                  {getInitials(c.display_name || c.username)}
                </Text>
              )}
              {isPending && (
                <View style={styles.pendingCenterOverlay}>
                  <Text style={styles.pendingCenterText}>Pendiente</Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {canEdit && (
          <Pressable
            style={styles.addCollaboratorCircle}
            onPress={onOpenPicker}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Añadir colaborador"
          >
            <UserPlus size={22} color="#D4B13A" strokeWidth={1.8} />
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}
