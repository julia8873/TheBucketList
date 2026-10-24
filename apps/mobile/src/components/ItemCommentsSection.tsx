import { themedStyleSheet } from '@bucketlist/ui';
import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Send, ChevronRight, CornerDownRight, X } from 'lucide-react-native';
import { Avatar, Typography, useTheme, fontFamily } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { initialsOf } from '../utils/initials';
import { ReportModal } from './ReportModal';
import { CommentThreadView } from './comments/CommentRow';
import { useCommentsController } from './comments/useCommentsController';

/** Cuántos hilos se muestran dentro de la tarea/álbum antes de «Ver más comentarios». */
const INLINE_THREADS = 3;

interface ItemCommentsSectionProps {
  targetId: string;
  targetType: 'bucket' | 'album';
  ownerId?: string;
  title?: string;
  /** Abre la hoja inferior con todos los comentarios. */
  onOpenModal: (autoFocus?: boolean) => void;
}

/**
 * Comentarios dentro de la tarea o el álbum. Usa el mismo diseño en árbol que la hoja inferior
 * (comentario principal + respuestas plegables) y muestra solo los hilos más recientes; con
 * «Ver más comentarios» se abre la hoja inferior con todos.
 */
export function ItemCommentsSection({
  targetId,
  targetType,
  ownerId,
  onOpenModal,
}: ItemCommentsSectionProps) {
  const { theme } = useTheme();
  const inputRef = useRef<TextInput>(null);

  const ctrl = useCommentsController({
    targetId,
    targetType,
    ownerId,
    onReplyStart: () => onOpenModal(true),
  });
  const { user, profile, comments, isLoading, threads, text, setText, replyingTo } = ctrl;

  // Los hilos con actividad más reciente, mostrados de más antiguo a más nuevo
  const { shownThreads, hiddenCount } = useMemo(() => {
    const byActivity = [...threads].sort((a, b) => a.lastActivity - b.lastActivity);
    const shown = byActivity.slice(-INLINE_THREADS);
    const shownIds = new Set(shown.map((t) => t.root.id));
    const ordered = threads.filter((t) => shownIds.has(t.root.id));
    const shownCount = ordered.reduce((acc, t) => acc + 1 + t.replies.length, 0);
    return { shownThreads: ordered, hiddenCount: Math.max(0, comments.length - shownCount) };
  }, [threads, comments.length]);

  const handleSend = async () => {
    await ctrl.send();
  };

  return (
    <View style={styles.container}>
      {/* Cabecera de la sección */}
      <View style={styles.headerRow}>
        <Typography variant="caption" color={gold[400]} style={styles.headerLabel}>
          COMENTARIOS · {comments.length}
        </Typography>
        {comments.length > 0 && (
          <Pressable
            onPress={() => onOpenModal(false)}
            hitSlop={8}
            style={styles.viewAllBtn}
            accessibilityRole="button"
            accessibilityLabel="Ver todos los comentarios"
          >
            <Text style={[styles.viewAllText, { color: gold[400] }]}>Ver todos ({comments.length})</Text>
            <ChevronRight size={14} color={gold[400]} />
          </Pressable>
        )}
      </View>

      {/* Lista de hilos */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={gold[400]} />
        </View>
      ) : comments.length === 0 ? (
        <Pressable
          onPress={() => inputRef.current?.focus()}
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
          {hiddenCount > 0 && (
            <Pressable
              onPress={() => onOpenModal(false)}
              style={styles.moreCommentsBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ver más comentarios"
            >
              <Text style={[styles.moreCommentsText, { color: gold[400] }]}>
                Ver más comentarios ({hiddenCount})
              </Text>
            </Pressable>
          )}
          {shownThreads.map((thread) => (
            <CommentThreadView key={thread.root.id} thread={thread} ctrl={ctrl} />
          ))}
        </View>
      )}

      {/* Aviso de respuesta */}
      {replyingTo && (
        <View style={[styles.replyBanner, { borderColor: theme.colors.border }]}>
          <CornerDownRight size={14} color={gold[400]} />
          <Text style={[styles.replyBannerText, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            Respondiendo a{' '}
            <Text style={{ fontFamily: fontFamily.semibold, color: gold[400] }}>
              {replyingTo.username ? `@${replyingTo.username}` : replyingTo.authorName}
            </Text>
          </Text>
          <Pressable
            onPress={() => {
              ctrl.cancelReply();
              setText('');
            }}
            hitSlop={8}
            accessibilityLabel="Cancelar respuesta"
          >
            <X size={15} color={theme.colors.foregroundMuted} />
          </Pressable>
        </View>
      )}

      {/* Barra para abrir el modal y añadir comentario */}
      {user && (
        <Pressable
          style={styles.inputRow}
          onPress={() => onOpenModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Añadir un comentario"
        >
          <Avatar
            uri={profile?.avatar_url ?? user.user_metadata?.avatar_url}
            initials={initialsOf({
              display_name:
                profile?.display_name ||
                profile?.username ||
                user.user_metadata?.display_name ||
                user.user_metadata?.full_name,
              username: profile?.username || user.user_metadata?.username,
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
            <Text
              style={[styles.placeholderText, { color: theme.colors.foregroundMuted }]}
              numberOfLines={1}
            >
              Añade un comentario...
            </Text>

            <View style={styles.sendBtn}>
              <Send size={14} color={theme.colors.foregroundMuted} />
            </View>
          </View>
        </Pressable>
      )}

      <ReportModal
        visible={!!ctrl.reportingComment}
        onClose={() => ctrl.setReportingComment(null)}
        kind="comment"
        subject={ctrl.reportingComment ? `Comentario de ${ctrl.reportingComment.author}` : undefined}
        isLoading={ctrl.isReporting}
        onSubmit={ctrl.submitReport}
      />
    </View>
  );
}

const styles = themedStyleSheet({
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
    gap: 16,
    marginBottom: 14,
  },
  moreCommentsBtn: {
    paddingVertical: 2,
  },
  moreCommentsText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  replyBannerText: {
    flex: 1,
    fontFamily: fontFamily.regular,
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
    paddingVertical: Platform.OS === 'ios' ? 9 : 8,
  },
  placeholderText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 13,
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
