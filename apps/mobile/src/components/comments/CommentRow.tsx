import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { displayNameOf, initialsOf } from '../../utils/initials';
import { timeAgo } from '../../utils/timeAgo';
import { OfficialBadge, isUserAdmin } from '../OfficialBadge';
import type { CommentThread } from './commentTree';
import type { CommentsController } from './useCommentsController';

const LIKE_COLOR = '#F43F5E';

/** Cuerpo del comentario con las @menciones resaltadas. */
function CommentBody({ body, color }: { body: string; color: string }) {
  const parts = body.split(/(@[a-zA-Z0-9_.-]+)/g);
  return (
    <Text style={[styles.commentText, { color }]}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <Text key={i} style={styles.mention}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

interface CommentRowProps {
  comment: any;
  ctrl: CommentsController;
  isReply?: boolean;
}

/** Un comentario (o respuesta) con sus acciones: me gusta, responder, editar, eliminar, reportar. */
export function CommentRow({ comment, ctrl, isReply = false }: CommentRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { user, ownerId } = ctrl;
  const c = theme.colors;
  const muted = c.foregroundMuted;

  const isMine = !!user && comment.user_id === user.id;
  const author = isMine && ctrl.profile ? { ...comment.user, ...ctrl.profile } : comment.user;
  const isItemOwner = !!user && !!ownerId && user.id === ownerId;
  const isCreator = !!ownerId && comment.user_id === ownerId;
  const isEditing = ctrl.editingCommentId === comment.id;

  const isEdited = Boolean(
    comment.is_edited ||
      (comment.updated_at &&
        comment.created_at &&
        Math.abs(new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime()) > 1000)
  );
  const editedLabel = t('common.edited', { defaultValue: 'editado' });

  const likes: Array<{ id?: string; user_id: string }> = comment.likes ?? [];
  const isLiked = !!user && likes.some((l) => l.user_id === user.id);

  return (
    <View style={[styles.row, isReply && styles.replyRow]}>
      {isReply && <View style={styles.replyConnector} pointerEvents="none" />}

      <Avatar uri={author?.avatar_url} initials={initialsOf(author)} size={isReply ? 'sm' : 'md'} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.authorName, { color: c.foreground }]} numberOfLines={1}>
            {displayNameOf(author)}
          </Text>
          {isUserAdmin(author) && <OfficialBadge size="xs" />}
          {isCreator && (
            <View style={styles.creatorTag}>
              <Text style={styles.creatorTagText}>Autor</Text>
            </View>
          )}
          <Text style={[styles.timeText, { color: muted }]}>
            {timeAgo(comment.created_at)}
            {isEdited && ` · ${editedLabel}`}
          </Text>
        </View>

        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: c.foreground,
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                },
              ]}
              value={ctrl.editingText}
              onChangeText={ctrl.setEditingText}
              multiline
              maxLength={1000}
              autoFocus
            />
            <View style={styles.editActions}>
              <Pressable
                onPress={() => ctrl.saveEdit(comment.id)}
                disabled={ctrl.isSavingEdit}
                style={styles.editSaveBtn}
                hitSlop={4}
              >
                {ctrl.isSavingEdit ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.editSaveText}>Guardar</Text>
                )}
              </Pressable>
              <Pressable onPress={ctrl.cancelEdit} disabled={ctrl.isSavingEdit} style={styles.editCancelBtn} hitSlop={4}>
                <Text style={[styles.editCancelText, { color: muted }]}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <CommentBody body={comment.body} color={c.foreground} />
        )}

        {!isEditing && (
          <View style={styles.actionsRow}>
            {/* Me gusta (siempre disponible, también en comentarios propios) */}
            <Pressable
              hitSlop={6}
              onPress={() => ctrl.toggleLike(comment.id)}
              style={styles.likeBtn}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
            >
              <Heart
                size={15}
                color={isLiked ? LIKE_COLOR : muted}
                fill={isLiked ? LIKE_COLOR : 'transparent'}
                strokeWidth={2}
              />
              {likes.length > 0 && (
                <Text style={[styles.likeCount, { color: isLiked ? LIKE_COLOR : muted }]}>{likes.length}</Text>
              )}
            </Pressable>

            <Pressable
              hitSlop={6}
              onPress={() => ctrl.startReply(comment)}
              accessibilityRole="button"
              accessibilityLabel="Responder comentario"
            >
              <Text style={[styles.actionText, { color: muted }]}>Responder</Text>
            </Pressable>

            {isMine && (
              <Pressable
                hitSlop={6}
                onPress={() => ctrl.startEdit(comment)}
                accessibilityRole="button"
                accessibilityLabel="Editar comentario"
              >
                <Text style={[styles.actionText, { color: muted }]}>Editar</Text>
              </Pressable>
            )}

            {!isMine && !!user && (
              <Pressable
                hitSlop={6}
                onPress={() => ctrl.setReportingComment({ id: comment.id, author: displayNameOf(author) })}
                accessibilityRole="button"
                accessibilityLabel="Reportar comentario"
              >
                <Text style={[styles.actionText, { color: muted }]}>Reportar</Text>
              </Pressable>
            )}

            {(isMine || isItemOwner) && (
              <Pressable
                hitSlop={6}
                onPress={() => ctrl.remove(comment.id)}
                accessibilityRole="button"
                accessibilityLabel="Eliminar comentario"
              >
                <Text style={[styles.actionText, styles.deleteText]}>Eliminar</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/** Botón «Ver N respuestas» / «Ocultar respuestas». */
function RepliesToggle({ count, expanded, onPress }: { count: number; expanded: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={styles.toggleRow}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Ocultar respuestas' : 'Ver respuestas'}
    >
      <View style={[styles.toggleLine, { backgroundColor: theme.colors.border }]} />
      {expanded ? (
        <ChevronUp size={13} color={gold[400]} />
      ) : (
        <ChevronDown size={13} color={theme.colors.foregroundMuted} />
      )}
      <Text style={[styles.toggleText, { color: expanded ? gold[400] : theme.colors.foregroundMuted }]}>
        {expanded ? 'Ocultar respuestas' : `Ver ${count} ${count === 1 ? 'respuesta' : 'respuestas'}`}
      </Text>
    </Pressable>
  );
}

/**
 * Un hilo completo: comentario principal y, debajo, todas sus respuestas en un único nivel
 * (incluidas las respuestas a otras respuestas) con un botón para mostrarlas u ocultarlas.
 */
export function CommentThreadView({ thread, ctrl }: { thread: CommentThread; ctrl: CommentsController }) {
  const { root, replies } = thread;
  const count = replies.length;
  const expanded = ctrl.expandedIds.has(root.id);

  return (
    <View style={styles.thread}>
      <CommentRow comment={root} ctrl={ctrl} />
      {count > 0 && !expanded && (
        <RepliesToggle count={count} expanded={false} onPress={() => ctrl.toggleReplies(root.id)} />
      )}
      {count > 0 &&
        expanded &&
        replies.map((reply) => <CommentRow key={reply.id} comment={reply} ctrl={ctrl} isReply />)}
      {count > 0 && expanded && (
        <RepliesToggle count={count} expanded onPress={() => ctrl.toggleReplies(root.id)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  replyRow: { marginLeft: 36, position: 'relative' },
  replyConnector: {
    position: 'absolute',
    left: -18,
    top: -6,
    height: 22,
    width: 12,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftColor: 'rgba(212, 175, 55, 0.35)',
    borderBottomColor: 'rgba(212, 175, 55, 0.35)',
    borderBottomLeftRadius: 8,
  },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  authorName: { fontSize: 13, fontFamily: fontFamily.semibold },
  creatorTag: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  creatorTagText: { color: gold[400], fontSize: 9, fontFamily: fontFamily.semibold, textTransform: 'uppercase' },
  timeText: { fontSize: 11, fontFamily: fontFamily.regular },
  commentText: { fontSize: 14, fontFamily: fontFamily.regular, lineHeight: 20 },
  mention: { color: gold[400], fontFamily: fontFamily.semibold },
  actionsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 6 },
  actionText: { fontSize: 12, fontFamily: fontFamily.semibold, letterSpacing: 0.2 },
  deleteText: { color: 'rgba(248, 113, 113, 0.9)' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount: { fontSize: 12, fontFamily: fontFamily.semibold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 46, gap: 8 },
  toggleLine: { width: 22, height: 1.5 },
  toggleText: { fontSize: 12, fontFamily: fontFamily.semibold },
  editContainer: { marginTop: 4 },
  editInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: gold[400],
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    minHeight: 50,
  },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  editSaveBtn: { backgroundColor: gold[400], paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  editSaveText: { color: '#000', fontSize: 12, fontFamily: fontFamily.semibold },
  editCancelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  editCancelText: { fontSize: 12, fontFamily: fontFamily.regular },
});
