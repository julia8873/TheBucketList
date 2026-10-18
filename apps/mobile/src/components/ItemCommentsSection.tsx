import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Send, MessageCircle, Heart, ChevronRight } from 'lucide-react-native';
import { Avatar, Typography, useTheme, fontFamily } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useComments, useAddComment, useToggleCommentLike } from '../hooks/useSocial';
import { useAuthStore } from '../stores/auth.store';
import { displayNameOf, initialsOf } from '../utils/initials';
import { timeAgo } from '../utils/timeAgo';
import { OfficialBadge, isUserAdmin } from './OfficialBadge';

interface ItemCommentsSectionProps {
  targetId: string;
  targetType: 'bucket' | 'album';
  ownerId?: string;
  title?: string;
  onOpenModal: (autoFocus?: boolean) => void;
}

export function ItemCommentsSection({
  targetId,
  targetType,
  ownerId,
  title,
  onOpenModal,
}: ItemCommentsSectionProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useComments(targetId, targetType);
  const addComment = useAddComment();
  const toggleLike = useToggleCommentLike();

  // Comentarios raíz (excluyendo respuestas anidadas para el preview)
  const rootComments = comments.filter((c) => !c.parent_id);
  // Mostrar los últimos 3 comentarios raíz
  const recentComments = rootComments.slice(-3);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || addComment.isPending) return;

    try {
      if (targetType === 'album') {
        await addComment.mutateAsync({
          albumId: targetId,
          targetType: 'album',
          userId: user.id,
          body: trimmed,
        });
      } else {
        await addComment.mutateAsync({
          bucketId: targetId,
          targetType: 'bucket',
          userId: user.id,
          body: trimmed,
        });
      }
      setText('');
    } catch (e) {
      console.error('Error al enviar comentario:', e);
    }
  };

  const handleToggleLike = (commentId: string) => {
    if (!user) return;
    toggleLike.mutate({
      commentId,
      bucketId: targetId,
      userId: user.id,
    });
  };

  return (
    <View style={styles.container}>
      {/* Cabecera de la sección */}
      <View style={styles.headerRow}>
        <Typography variant="caption" color={gold[400]} style={styles.headerLabel}>
          COMENTARIOS · {comments.length}
        </Typography>
        <Pressable
          onPress={() => onOpenModal(false)}
          hitSlop={8}
          style={styles.viewAllBtn}
          accessibilityRole="button"
          accessibilityLabel="Ver todos los comentarios"
        >
          <Text style={[styles.viewAllText, { color: gold[400] }]}>
            {comments.length > 0 ? `Ver todos (${comments.length})` : 'Comentar'}
          </Text>
          <ChevronRight size={14} color={gold[400]} />
        </Pressable>
      </View>

      {/* Lista de comentarios sin cajas ni marcos */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={gold[400]} />
        </View>
      ) : comments.length === 0 ? (
        <Pressable
          onPress={() => onOpenModal(true)}
          style={styles.emptyPrompt}
          hitSlop={6}
          accessibilityRole="button"
        >
          <Text style={[styles.emptyPromptText, { color: theme.colors.foregroundMuted }]}>
            Sé el primero en dejar un comentario...
          </Text>
        </Pressable>
      ) : (
        <View style={styles.commentsList}>
          {recentComments.map((comment) => {
            const author = comment.user;
            const isCreator = !!ownerId && comment.user_id === ownerId;
            const isAuthorOfComment = !!user && comment.user_id === user.id;

            const likes: Array<{ id?: string; user_id: string }> = comment.likes ?? [];
            const likesCount = likes.length;
            const isLiked = !!user && likes.some((l) => l.user_id === user.id);

            const repliesCount = comments.filter((r) => r.parent_id === comment.id).length;

            return (
              <View key={comment.id} style={styles.commentRow}>
                {/* Avatar a la izquierda */}
                <Avatar
                  uri={author?.avatar_url}
                  initials={initialsOf(author)}
                  size="sm"
                />

                {/* Contenido limpio (sin caja, sin borde, igual que al comentar) */}
                <View style={styles.commentContent}>
                  {/* Autor y fecha */}
                  <View style={styles.authorRow}>
                    <Text
                      style={[styles.authorName, { color: theme.colors.foreground }]}
                      numberOfLines={1}
                    >
                      {displayNameOf(author)}
                    </Text>
                    {isUserAdmin(author) && <OfficialBadge size="xs" />}
                    {isCreator && (
                      <View style={styles.creatorTag}>
                        <Text style={styles.creatorTagText}>Autor</Text>
                      </View>
                    )}
                    <Text style={[styles.timeText, { color: theme.colors.foregroundMuted }]}>
                      {timeAgo(comment.created_at)}
                    </Text>
                  </View>

                  {/* Cuerpo del comentario */}
                  <Text
                    style={[styles.commentBody, { color: theme.colors.foreground }]}
                    numberOfLines={4}
                  >
                    {comment.body}
                  </Text>

                  {/* Acciones: responder, me gusta, ver respuestas */}
                  <View style={styles.actionsRow}>
                    <Pressable
                      onPress={() => onOpenModal(true)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel="Responder comentario"
                    >
                      <Text style={[styles.actionBtnText, { color: theme.colors.foregroundMuted }]}>
                        Responder
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleToggleLike(comment.id)}
                      hitSlop={6}
                      style={styles.likeBtn}
                      accessibilityRole="button"
                      accessibilityLabel="Me gusta"
                    >
                      <Heart
                        size={12}
                        color={isLiked ? '#EF4444' : theme.colors.foregroundMuted}
                        fill={isLiked ? '#EF4444' : 'transparent'}
                        strokeWidth={1.8}
                      />
                      {likesCount > 0 && (
                        <Text
                          style={[
                            styles.likeCountText,
                            { color: isLiked ? '#EF4444' : theme.colors.foregroundMuted },
                          ]}
                        >
                          {likesCount}
                        </Text>
                      )}
                    </Pressable>

                    {repliesCount > 0 && (
                      <Pressable
                        onPress={() => onOpenModal(false)}
                        hitSlop={6}
                        style={styles.repliesCountBtn}
                        accessibilityRole="button"
                      >
                        <Text style={[styles.repliesCountText, { color: gold[400] }]}>
                          Ver {repliesCount} {repliesCount === 1 ? 'respuesta' : 'respuestas'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {/* Enlace para ver más comentarios si hay más de los mostrados */}
          {rootComments.length > recentComments.length && (
            <Pressable
              onPress={() => onOpenModal(false)}
              style={styles.moreCommentsBtn}
              hitSlop={8}
            >
              <Text style={[styles.moreCommentsText, { color: gold[400] }]}>
                Ver los {rootComments.length - recentComments.length} comentarios anteriores...
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Barra de entrada para escribir comentario directamente */}
      {user && (
        <View style={styles.inputRow}>
          <Avatar
            uri={user.user_metadata?.avatar_url}
            initials={initialsOf({
              display_name: user.user_metadata?.display_name || user.user_metadata?.full_name,
              username: user.user_metadata?.username,
            })}
            size="sm"
          />

          <View
            style={[
              styles.inputPill,
              {
                backgroundColor: theme.dark ? '#1B1B1B' : '#EFEAE1',
                borderColor: theme.dark ? '#2B2B2B' : '#DED7CA',
              },
            ]}
          >
            <TextInput
              style={[styles.textInput, { color: theme.colors.foreground }]}
              placeholder="Añade un comentario..."
              placeholderTextColor={theme.colors.foregroundMuted}
              value={text}
              onChangeText={setText}
              maxLength={1000}
            />

            <Pressable
              onPress={handleSend}
              disabled={!text.trim() || addComment.isPending}
              style={[
                styles.sendBtn,
                text.trim().length > 0 && styles.sendBtnActive,
              ]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Enviar comentario"
            >
              {addComment.isPending ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Send
                  size={14}
                  color={text.trim().length > 0 ? '#000' : theme.colors.foregroundMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLabel: {
    letterSpacing: 1.2,
    fontFamily: fontFamily.bold,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewAllText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPrompt: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  emptyPromptText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
  commentsList: {
    gap: 14,
    marginBottom: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  commentContent: {
    flex: 1,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  authorName: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  creatorTag: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  creatorTagText: {
    color: gold[400],
    fontSize: 9,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  commentBody: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  actionBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCountText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  repliesCountBtn: {
    marginLeft: 2,
  },
  repliesCountText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
  },
  moreCommentsBtn: {
    paddingVertical: 4,
    marginTop: 2,
  },
  moreCommentsText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 7 : 3,
  },
  textInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
    padding: 0,
    marginRight: 6,
  },
  sendBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  sendBtnActive: {
    backgroundColor: gold[400],
  },
});
