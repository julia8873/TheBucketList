import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, confirm, toast } from '@bucketlist/ui';
import { i18n } from '@bucketlist/shared';
import { useAuthStore } from '../../stores/auth.store';
import { useCurrentUserProfile } from '../../hooks/useCurrentUserProfile';
import {
  useComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
} from '../../hooks/useSocial';
import { useReportContent } from '../../hooks/useBlockReport';
import { displayNameOf } from '../../utils/initials';
import { buildCommentThreads, findRootId } from './commentTree';

export interface ReplyingToState {
  id: string;
  authorName: string;
  username?: string | null;
}

interface Options {
  targetId: string;
  targetType: 'bucket' | 'album';
  ownerId?: string;
  /** Se llama justo después de pulsar «Responder» (p. ej. para dar foco al campo de texto). */
  onReplyStart?: () => void;
}

/**
 * Lógica compartida de los comentarios: la usan tanto la sección que aparece dentro de la tarea /
 * álbum como la hoja inferior con todos los comentarios, de modo que ambas se comportan igual.
 */
export function useCommentsController({ targetId, targetType, ownerId, onReplyStart }: Options) {
  const { user } = useAuthStore();
  const { data: profile } = useCurrentUserProfile();
  const { data: comments = [], isLoading } = useComments(targetId, targetType);
  const addComment = useAddComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleCommentLike = useToggleCommentLike();
  const reportContent = useReportContent();

  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyingToState | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reportingComment, setReportingComment] = useState<{ id: string; author: string } | null>(null);

  const onReplyStartRef = useRef(onReplyStart);
  onReplyStartRef.current = onReplyStart;

  const threads = useMemo(() => buildCommentThreads(comments), [comments]);

  const targetIds = {
    bucketId: targetType === 'bucket' ? targetId : undefined,
    albumId: targetType === 'album' ? targetId : undefined,
  };

  const toggleReplies = useCallback((rootId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  const startReply = useCallback(
    (comment: any) => {
      const author = comment.user;
      const name = displayNameOf(author);
      const username = author?.username;
      const mentionTag = username ? `@${username}` : `@${name}`;

      setReplyingTo({ id: comment.id, authorName: name, username });
      setText((prev) => {
        if (prev.startsWith(mentionTag)) return prev;
        return `${mentionTag} ${prev}`.trimStart();
      });
      onReplyStartRef.current?.();
    },
    [],
  );

  const cancelReply = useCallback(() => setReplyingTo(null), []);

  const send = useCallback(async (): Promise<boolean> => {
    const trimmed = text.trim();
    if (!trimmed || !user || addComment.isPending) return false;

    const parentId = replyingTo?.id || null;
    try {
      // Si es una respuesta, desplegamos el hilo completo para que se vea el mensaje nuevo
      // (también cuando se responde a otra respuesta: todas cuelgan del mismo comentario raíz).
      if (parentId) {
        const rootId = findRootId(comments, parentId);
        setExpandedIds((prev) => new Set(prev).add(rootId));
      }
      await addComment.mutateAsync({
        ...targetIds,
        targetType,
        userId: user.id,
        body: trimmed,
        parentId,
      });
      setText('');
      setReplyingTo(null);
      return true;
    } catch (err: any) {
      Alert.alert(i18n.t('common.error', { defaultValue: 'Error' }), err?.message || i18n.t('comments.send_error'));
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, user, addComment, replyingTo, comments, targetId, targetType]);

  const startEdit = useCallback((comment: any) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.body);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingCommentId(null);
    setEditingText('');
  }, []);

  const saveEdit = useCallback(
    async (commentId: string) => {
      const trimmed = editingText.trim();
      if (!trimmed) {
        Alert.alert(i18n.t('comments.notice'), i18n.t('comments.empty_comment_error'));
        return;
      }
      try {
        await updateComment.mutateAsync({ commentId, ...targetIds, body: trimmed });
        setEditingCommentId(null);
        setEditingText('');
      } catch (err: any) {
        Alert.alert(i18n.t('common.error', { defaultValue: 'Error' }), err?.message || i18n.t('comments.edit_error'));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingText, updateComment, targetId, targetType],
  );

  const remove = useCallback(
    (commentId: string) => {
      confirm.show({
        title: i18n.t('comments.delete_confirm_title'),
        message: i18n.t('comments.delete_confirm_msg'),
        confirmLabel: i18n.t('comments.delete'),
        cancelLabel: i18n.t('comments.cancel'),
        destructive: true,
        onConfirm: () => {
          deleteComment.mutate(
            { commentId, ...targetIds },
            {
              onSuccess: () => toast.success(i18n.t('comments.deleted_toast')),
              onError: (err: any) => toast.error(err?.message || i18n.t('comments.delete_error')),
            },
          );
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deleteComment, targetId, targetType],
  );

  const toggleLike = useCallback(
    (commentId: string) => {
      if (!user) return;
      toggleCommentLike.mutate({ commentId, userId: user.id, targetId, targetType });
    },
    [user, toggleCommentLike, targetId, targetType],
  );

  const submitReport = useCallback(
    async (reason: string, details?: string) => {
      if (!reportingComment) return;
      await reportContent.mutateAsync({
        targetType: 'comment',
        targetId: reportingComment.id,
        reason,
        details,
      } as any);
    },
    [reportingComment, reportContent],
  );

  return {
    user,
    profile,
    ownerId,
    targetId,
    targetType,
    comments,
    isLoading,
    threads,
    // composición
    text,
    setText,
    replyingTo,
    startReply,
    cancelReply,
    send,
    isSending: addComment.isPending,
    // edición
    editingCommentId,
    editingText,
    setEditingText,
    startEdit,
    cancelEdit,
    saveEdit,
    isSavingEdit: updateComment.isPending,
    // resto de acciones
    remove,
    toggleLike,
    expandedIds,
    toggleReplies,
    reportingComment,
    setReportingComment,
    submitReport,
    isReporting: reportContent.isPending,
  };
}

export type CommentsController = ReturnType<typeof useCommentsController>;
