import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { UserPlus, SlidersHorizontal, Clock } from 'lucide-react-native';
import { normalizeStorageUrl } from '@/constants/urls';
import { useRouter } from 'expo-router';
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
  onOpenSettings?: () => void;
  pendingCount?: number;
}

export function BucketCollaboratorsRow({
  bucket,
  collaborators,
  participantsData,
  user,
  canEdit,
  onOpenPicker,
  onOpenSettings,
  pendingCount = 0,
}: BucketCollaboratorsRowProps) {
  const router = useRouter();
  const isOwnerUser = bucket.user_id === user?.id;
  const ownerEntry = {
    id: bucket.user_id,
    username: bucket.user?.username || (isOwnerUser ? user?.user_metadata?.username || user?.email?.split('@')[0] || '' : ''),
    display_name: bucket.user?.display_name || (isOwnerUser ? user?.user_metadata?.display_name || user?.user_metadata?.full_name || null : null),
    avatar_url: bucket.user?.avatar_url || (isOwnerUser ? user?.user_metadata?.avatar_url || null : null),
    status: 'accepted',
    isOwner: true,
  };

  const ownerId = bucket.user_id;

  const visibleParticipants = participantsData.filter((p: any) => {
    if (p.id === ownerId) return false;
    if (!p.status || p.status === 'accepted') return true;
    if (p.status === 'pending') return canEdit || p.id === user?.id;
    return false;
  });

  const visibleCollaborators = collaborators.filter((c: any) => {
    if (c.status === 'accepted') return true;
    if (c.status === 'pending') return canEdit || c.id === user?.id;
    return false;
  });

  const byId = new Map<string, any>();
  [
    ownerEntry,
    ...visibleParticipants,
    ...visibleCollaborators.filter((c: any) => c.id !== ownerId),
  ].forEach((c: any) => {
    if (!byId.has(c.id)) {
      byId.set(c.id, c);
    } else {
      const existing = byId.get(c.id);
      if (existing?.status === 'pending' && c.status === 'accepted') {
        byId.set(c.id, { ...existing, ...c });
      }
    }
  });
  const everyone = Array.from(byId.values());
  const participants = everyone;

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
              onPress={() => {
                if (isPending && canEdit && onOpenSettings) {
                  onOpenSettings();
                } else if (c.id) {
                  router.push(`/profile/${c.id}` as any);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${c.display_name || c.username || 'usuario'}`}
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
          <>
            <Pressable
              style={styles.addCollaboratorCircle}
              onPress={onOpenPicker}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Añadir colaborador"
            >
              <UserPlus size={22} color="#D4B13A" strokeWidth={1.8} />
            </Pressable>

            {isOwnerUser && onOpenSettings && (
              <Pressable
                style={[
                  styles.addCollaboratorCircle,
                  { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#333333' },
                  pendingCount > 0 && { borderColor: '#D4B13A', backgroundColor: 'rgba(212,177,58,0.12)' },
                ]}
                onPress={onOpenSettings}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Ajustes de colaboración"
              >
                {pendingCount > 0 ? (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={16} color="#D4B13A" strokeWidth={2.4} />
                    <View
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        backgroundColor: '#EF4444',
                        borderRadius: 8,
                        minWidth: 16,
                        height: 16,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 3,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700' }}>
                        {pendingCount}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <SlidersHorizontal size={18} color="#CFCABD" strokeWidth={2} />
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
