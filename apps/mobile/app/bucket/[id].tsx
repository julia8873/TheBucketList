import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Image, TextInput, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Typography, useTheme, spacing, Avatar, Button, Icon, Card, Badge, radii } from '@bucketlist/ui';
import { ArrowLeft, Send, MapPin, Calendar, CheckSquare, Copy, Smile } from 'lucide-react-native';
import { format } from 'date-fns';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';

const EMOJIS = ['🔥', '❤️', '👏', '🎉', '✈️', '🌟'];

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [commentText, setCommentText] = useState('');
  const addComment = useAddComment();
  const copyBucket = useCopyBucket();
  const toggleReaction = useToggleReaction();

  const { data: bucket, isLoading, refetch } = useQuery({
    queryKey: ['bucketDetail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buckets')
        .select(`
          *,
          user:profiles(*),
          category:categories(*),
          item_subtasks(*),
          bucket_photos(*),
          reactions(*, user:profiles(*)),
          comments(*, user:profiles(*))
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!bucket) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color="error">Goal not found.</Typography>
      </View>
    );
  }

  const isOwner = bucket.user_id === user?.id;
  const comments = bucket.comments?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
  
  const reactionCounts = bucket.reactions?.reduce((acc: any, r: any) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const userReaction = bucket.reactions?.find((r: any) => r.user_id === user?.id);

  const handleSendComment = () => {
    if (!commentText.trim() || !user || !id) return;
    addComment.mutate(
      { bucketId: id, userId: user.id, body: commentText.trim() },
      { onSuccess: () => setCommentText('') }
    );
  };

  const handleCopy = () => {
    if (!user || !id) return;
    copyBucket.mutate(
      { bucketId: id, userId: user.id },
      { onSuccess: () => {
          alert('Copied to your list!');
          router.push('/(tabs)/my-list'); // go to My List
        } 
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Button variant="ghost" size="sm" onPress={() => router.back()} style={{ padding: 0, width: 40 }}>
          <Icon icon={ArrowLeft} size={24} color={theme.colors.foreground} />
        </Button>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* Header info */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[4] }}>
              <Pressable onPress={() => router.push(`/profile/${bucket.user_id}` as any)}>
                <Avatar 
                  source={bucket.user?.avatar_url ? { uri: bucket.user.avatar_url } : undefined} 
                  fallback={bucket.user?.display_name?.charAt(0) || bucket.user?.username?.charAt(0) || '?'} 
                  size="sm" 
                />
              </Pressable>
              <View style={{ marginLeft: spacing[3], flex: 1 }}>
                <Typography variant="body" style={{ fontWeight: 'bold' }}>
                  {bucket.user?.display_name || bucket.user?.username}
                </Typography>
                <Typography variant="caption" color="textMuted">
                  {format(new Date(bucket.created_at), 'MMM d, yyyy')}
                </Typography>
              </View>
              <Badge label={bucket.status.toUpperCase().replace('_', ' ')} variant={getStatusColor(bucket.status) as any} />
            </View>

            <Typography variant="h2" style={{ marginBottom: spacing[2] }}>{bucket.title}</Typography>
            
            {bucket.description && (
              <Typography variant="body" color="textSecondary" style={{ marginBottom: spacing[4] }}>
                {bucket.description}
              </Typography>
            )}

            <View style={styles.metaData}>
              {bucket.location_text && (
                <View style={styles.metaRow}>
                  <Icon icon={MapPin} size={16} color={theme.colors.foregroundMuted} />
                  <Typography variant="caption" color="textSecondary" style={{ marginLeft: spacing[2] }}>{bucket.location_text}</Typography>
                </View>
              )}
              {bucket.deadline && (
                <View style={styles.metaRow}>
                  <Icon icon={Calendar} size={16} color={theme.colors.foregroundMuted} />
                  <Typography variant="caption" color="textSecondary" style={{ marginLeft: spacing[2] }}>
                    {format(new Date(bucket.deadline), 'PPP')}
                  </Typography>
                </View>
              )}
              {bucket.category?.name && (
                <View style={[styles.metaRow, { backgroundColor: theme.colors.surface, paddingHorizontal: spacing[2], borderRadius: radii.sm }]}>
                  <Typography variant="caption" style={{ color: bucket.category.color || theme.colors.primary }}>
                    {bucket.category.name}
                  </Typography>
                </View>
              )}
            </View>

            {/* Photos */}
            {bucket.bucket_photos && bucket.bucket_photos.length > 0 && (
              <FlatList
                data={bucket.bucket_photos}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <Image 
                    source={{ uri: storageApi.getPublicUrl(item.storage_path) }} 
                    style={styles.photo}
                  />
                )}
                contentContainerStyle={styles.photoList}
              />
            )}

            {/* Subtasks */}
            {bucket.item_subtasks && bucket.item_subtasks.length > 0 && (
              <View style={styles.subtasks}>
                <Typography variant="h4" style={{ marginBottom: spacing[3] }}>Subtasks</Typography>
                {bucket.item_subtasks.map((st: any) => (
                  <View key={st.id} style={styles.subtaskRow}>
                    <Icon 
                      icon={CheckSquare} 
                      size={20} 
                      color={st.done ? theme.colors.success : theme.colors.border} 
                    />
                    <Typography 
                      variant="body" 
                      color={st.done ? 'textMuted' : 'text'}
                      style={[{ marginLeft: spacing[3] }, st.done && { textDecorationLine: 'line-through' }]}
                    >
                      {st.title}
                    </Typography>
                  </View>
                ))}
              </View>
            )}

            {/* Reactions */}
            <View style={styles.reactionBar}>
              {EMOJIS.map(emoji => {
                const count = reactionCounts?.[emoji] || 0;
                const isSelected = userReaction?.emoji === emoji;
                
                return (
                  <Pressable 
                    key={emoji}
                    onPress={() => user && toggleReaction.mutate({ bucketId: id, userId: user.id, emoji })}
                    style={[
                      styles.reactionPill, 
                      { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface },
                      { borderColor: theme.colors.border, borderWidth: 1 }
                    ]}
                  >
                    <Typography variant="caption">{emoji} {count > 0 ? count : ''}</Typography>
                  </Pressable>
                );
              })}
            </View>

            {/* Actions */}
            {!isOwner && (
              <Button 
                variant="primary" 
                leftIcon={<Icon icon={Copy} size={20} color={theme.colors.primaryForeground} />}
                onPress={handleCopy}
                loading={copyBucket.isPending}
                style={{ marginTop: spacing[6] }}
              >
                I want to do this too
              </Button>
            )}

            <Typography variant="h4" style={{ marginTop: spacing[8], marginBottom: spacing[4] }}>
              Comments ({comments.length})
            </Typography>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.commentRow}>
            <Avatar 
              source={item.user?.avatar_url ? { uri: item.user.avatar_url } : undefined} 
              fallback={item.user?.display_name?.charAt(0) || '?'} 
              size="sm" 
            />
            <View style={styles.commentContent}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Typography variant="body" style={{ fontWeight: 'bold', marginRight: spacing[2] }}>
                  {item.user?.display_name || item.user?.username}
                </Typography>
                <Typography variant="caption" color="textMuted">
                  {format(new Date(item.created_at), 'MMM d')}
                </Typography>
              </View>
              <Typography variant="body">{item.body}</Typography>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Typography variant="body" color="textMuted" style={{ textAlign: 'center', marginVertical: spacing[6] }}>
            No comments yet. Be the first!
          </Typography>
        }
      />

      {/* Input */}
      <View style={[styles.inputContainer, { borderTopColor: theme.colors.border }]}>
        <TextInput
          style={[styles.input, { color: theme.colors.foreground, backgroundColor: theme.colors.surface }]}
          placeholder="Add a comment..."
          placeholderTextColor={theme.colors.foregroundMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <Button 
          variant="ghost" 
          onPress={handleSendComment} 
          disabled={!commentText.trim() || addComment.isPending}
          style={{ padding: spacing[2] }}
        >
          <Icon icon={Send} size={24} color={commentText.trim() ? theme.colors.primary : theme.colors.foregroundMuted} />
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[2],
  },
  content: {
    padding: spacing[4],
  },
  metaData: {
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoList: {
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  photo: {
    width: 250,
    height: 250,
    borderRadius: radii.md,
    backgroundColor: '#eee',
  },
  subtasks: {
    marginBottom: spacing[6],
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  reactionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  reactionPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.full,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  commentContent: {
    marginLeft: spacing[3],
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginRight: spacing[2],
    fontSize: 16,
  },
});
