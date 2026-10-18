import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {
  MessageCircle,
  X,
  Send,
  Heart,
  CornerDownRight,
  AtSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { Avatar, fontFamily, gold, confirm, toast } from '@bucketlist/ui';
import { useAuthStore } from '../stores/auth.store';
import {
  useComments,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useToggleCommentLike,
} from '../hooks/useSocial';
import { useConnections, usePeopleSearch } from '../hooks/useFriends';
import { displayNameOf, initialsOf } from '../utils/initials';
import { timeAgo } from '../utils/timeAgo';
import { OfficialBadge, isUserAdmin } from './OfficialBadge';

interface TaskCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  bucketId?: string;
  albumId?: string;
  targetType?: 'bucket' | 'album';
  bucketTitle?: string;
  albumTitle?: string;
  bucketOwnerId?: string;
  albumOwnerId?: string;
  autoFocus?: boolean;
}

interface ReplyingToState {
  id: string;
  authorName: string;
  username?: string | null;
}

export function TaskCommentsModal(props: TaskCommentsModalProps) {
  if (!props.visible) return null;
  return <TaskCommentsModalContent {...props} />;
}

function TaskCommentsModalContent({
  visible,
  onClose,
  bucketId,
  albumId,
  targetType,
  bucketTitle,
  albumTitle,
  bucketOwnerId,
  albumOwnerId,
  autoFocus = false,
}: TaskCommentsModalProps) {
  const effectiveTargetType: 'bucket' | 'album' = targetType || (albumId ? 'album' : 'bucket');
  const effectiveId = (effectiveTargetType === 'album' ? albumId : bucketId) || '';
  const effectiveTitle = (effectiveTargetType === 'album' ? (albumTitle || bucketTitle) : (bucketTitle || albumTitle)) || '';
  const effectiveOwnerId = effectiveTargetType === 'album' ? (albumOwnerId || bucketOwnerId) : (bucketOwnerId || albumOwnerId);

  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyingToState | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Set de IDs de comentarios cuyas respuestas están visibles (por defecto escondidas)
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());

  // Estado para autocompletar menciones con @
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && autoFocus) {
      // Defer focus slightly so modal slide animation completes cleanly without layout race
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [visible, autoFocus]);

  // Amigos (seguidos y seguidores)
  const { data: following = [] } = useConnections(user?.id, 'following');
  const { data: followers = [] } = useConnections(user?.id, 'followers');
  const { data: searchedPeople = [] } = usePeopleSearch(mentionFilter);

  const friendsList = useMemo(() => {
    const map = new Map<string, any>();
    following.forEach((p) => map.set(p.id, p));
    followers.forEach((p) => map.set(p.id, p));
    if (user?.id) map.delete(user.id);
    return Array.from(map.values());
  }, [following, followers, user?.id]);

  const matchingFriends = useMemo(() => {
    const q = mentionFilter.toLowerCase().trim();
    if (!q) return friendsList;
    const filtered = friendsList.filter(
      (f) =>
        f.username?.toLowerCase().includes(q) ||
        f.display_name?.toLowerCase().includes(q)
    );
    if (filtered.length > 0) return filtered;
    return searchedPeople.filter((p) => p.id !== user?.id);
  }, [mentionFilter, friendsList, searchedPeople, user?.id]);

  const currentUserProfile = {
    display_name: (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name) as string | undefined,
    username: (user?.user_metadata?.username || user?.email?.split('@')[0]) as string | undefined,
    avatar_url: (user?.user_metadata?.avatar_url) as string | undefined,
  };

  const { data: comments = [], isLoading } = useComments(effectiveId, effectiveTargetType);
  const addComment = useAddComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleCommentLike = useToggleCommentLike();

  const toggleReplies = (commentId: string) => {
    setExpandedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Construye la lista de elementos para el FlatList:
  // - Comentarios principales (raíz)
  // - Si el comentario tiene respuestas y está desplegado, añade las respuestas debajo tabuladas
  // - Botón de alternar "Ver X respuestas" / "Ocultar respuestas" (por defecto escondidas)
  const visibleItems = useMemo(() => {
    const commentMap = new Map<string, any>();
    comments.forEach((c) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    const roots: any[] = [];
    comments.forEach((c) => {
      const item = commentMap.get(c.id);
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id).replies.push(item);
      } else {
        roots.push(item);
      }
    });

    const list: Array<
      | { type: 'comment'; key: string; comment: any; isReply: boolean; depth: number }
      | { type: 'toggle_replies'; key: string; parentCommentId: string; replyCount: number; isExpanded: boolean }
    > = [];

    roots.forEach((root) => {
      list.push({ type: 'comment', key: `comment-${root.id}`, comment: root, isReply: false, depth: 0 });

      const replyCount = root.replies.length;
      if (replyCount > 0) {
        const isExpanded = expandedCommentIds.has(root.id);
        if (isExpanded) {
          root.replies.forEach((reply: any) => {
            list.push({ type: 'comment', key: `comment-${reply.id}`, comment: reply, isReply: true, depth: 1 });
          });
        }
        list.push({
          type: 'toggle_replies',
          key: `toggle-${root.id}`,
          parentCommentId: root.id,
          replyCount,
          isExpanded,
        });
      }
    });

    return list;
  }, [comments, expandedCommentIds]);

  const handleTextChange = (newText: string) => {
    setText(newText);

    // Detectar si el usuario está escribiendo una mención con @
    const lastAtIndex = newText.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const textAfterAt = newText.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionFilter(textAfterAt);
        setShowMentionPicker(true);
        return;
      }
    }
    setShowMentionPicker(false);
    setMentionFilter('');
  };

  const handleSelectMention = (person: any) => {
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = text.slice(0, lastAtIndex);
      const username = person.username || displayNameOf(person);
      setText(`${beforeAt}@${username} `);
    }
    setShowMentionPicker(false);
    setMentionFilter('');
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || !user || addComment.isPending) return;

    try {
      setText('');
      setShowMentionPicker(false);
      setMentionFilter('');
      const parentId = replyingTo?.id || null;
      setReplyingTo(null);

      // Si es una respuesta, desplegamos automáticamente el hilo padre para ver la nueva respuesta
      if (parentId) {
        const parentComment = comments.find((c) => c.id === parentId);
        const rootId = parentComment?.parent_id || parentId;
        setExpandedCommentIds((prev) => new Set(prev).add(rootId));
      }

      await addComment.mutateAsync({
        bucketId: effectiveTargetType === 'bucket' ? effectiveId : undefined,
        albumId: effectiveTargetType === 'album' ? effectiveId : undefined,
        targetType: effectiveTargetType,
        userId: user.id,
        body: trimmed,
        parentId,
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo enviar el comentario.');
    }
  };

  const handleReply = (comment: any) => {
    const author = comment.user;
    const name = displayNameOf(author);
    const username = author?.username;
    const mentionTag = username ? `@${username}` : `@${name}`;

    setReplyingTo({
      id: comment.id,
      authorName: name,
      username,
    });

    setText((prev) => {
      if (prev.startsWith(mentionTag)) return prev;
      return `${mentionTag} ${prev}`.trimStart();
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (commentId: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      Alert.alert('Aviso', 'El comentario no puede estar vacío.');
      return;
    }

    try {
      await updateComment.mutateAsync({
        commentId,
        bucketId: effectiveTargetType === 'bucket' ? effectiveId : undefined,
        albumId: effectiveTargetType === 'album' ? effectiveId : undefined,
        body: trimmed,
      });
      setEditingCommentId(null);
      setEditingText('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo editar el comentario.');
    }
  };

  const handleDelete = (commentId: string) => {
    confirm.show({
      title: '¿Eliminar comentario?',
      message: '¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: () => {
        deleteComment.mutate(
          {
            commentId,
            bucketId: effectiveTargetType === 'bucket' ? effectiveId : undefined,
            albumId: effectiveTargetType === 'album' ? effectiveId : undefined,
          },
          {
            onSuccess: () => {
              toast.success('Comentario eliminado');
            },
            onError: (err: any) =>
              toast.error(err?.message || 'No se pudo eliminar el comentario.'),
          }
        );
      },
    });
  };

  const handleToggleLike = (commentId: string) => {
    if (!user) return;
    toggleCommentLike.mutate({
      commentId,
      bucketId: effectiveTargetType === 'bucket' ? effectiveId : '',
      userId: user.id,
    });
  };

  const renderCommentBody = (body: string) => {
    const parts = body.split(/(@[a-zA-Z0-9_.-]+)/g);
    return (
      <Text style={styles.commentText}>
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            return (
              <Text key={i} style={styles.mentionHighlight}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={[styles.sheetContent, isKeyboardVisible && styles.sheetContentKeyboard]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <MessageCircle size={18} color={gold[400]} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>Comentarios</Text>
                  {comments.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{comments.length}</Text>
                    </View>
                  )}
                </View>
                {effectiveTitle ? (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {effectiveTitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Cerrar comentarios"
            >
              <X size={20} color="#888" />
            </Pressable>
          </View>

          {/* Lista de comentarios sin caja exterior, con fotos a la izquierda y respuestas plegables */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={gold[400]} size="small" />
            </View>
          ) : comments.length === 0 ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={[
                styles.emptyContainer,
                isKeyboardVisible && styles.emptyContainerKeyboard,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {!isKeyboardVisible && (
                <View style={styles.emptyIconCircle}>
                  <MessageCircle size={28} color="rgba(255,255,255,0.25)" />
                </View>
              )}
              <Text style={styles.emptyTitle}>Aún no hay comentarios</Text>
              {!isKeyboardVisible && (
                <Text style={styles.emptySubtitle}>
                  Sé el primero en compartir qué opinas o dar ánimos sobre esta meta.
                </Text>
              )}
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={visibleItems}
              keyExtractor={(item) => item.key}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.type === 'toggle_replies') {
                  return (
                    <Pressable
                      style={styles.toggleRepliesRow}
                      onPress={() => toggleReplies(item.parentCommentId)}
                      hitSlop={6}
                    >
                      <View style={styles.toggleRepliesLine} />
                      {item.isExpanded ? (
                        <ChevronUp size={13} color={gold[400]} />
                      ) : (
                        <ChevronDown size={13} color="rgba(255,255,255,0.5)" />
                      )}
                      <Text
                        style={[
                          styles.toggleRepliesText,
                          item.isExpanded && styles.toggleRepliesTextActive,
                        ]}
                      >
                        {item.isExpanded
                          ? 'Ocultar respuestas'
                          : `Ver ${item.replyCount} ${item.replyCount === 1 ? 'respuesta' : 'respuestas'}`}
                      </Text>
                    </Pressable>
                  );
                }

                const { comment, isReply } = item;
                const author = comment.user;
                const isAuthorOfComment = !!user && comment.user_id === user.id;
                const isItemOwner = !!user && user.id === effectiveOwnerId;
                const isCreator = !!effectiveOwnerId && comment.user_id === effectiveOwnerId;
                const isEditing = editingCommentId === comment.id;

                const likes: Array<{ id?: string; user_id: string }> = comment.likes ?? [];
                const likesCount = likes.length;
                const isLikedByMe = !!user && likes.some((l) => l.user_id === user.id);

                return (
                  <View
                    style={[
                      styles.commentRow,
                      isReply && styles.replyCommentRow,
                    ]}
                  >
                    {/* Conector gráfico de hilo para respuestas tabuladas */}
                    {isReply && (
                      <View style={styles.replyThreadConnector} pointerEvents="none" />
                    )}

                    {/* Foto de perfil a la izquierda del usuario */}
                    <Avatar
                      uri={author?.avatar_url}
                      initials={initialsOf(author)}
                      size={isReply ? 'sm' : 'md'}
                    />

                    {/* Contenido sin caja exterior */}
                    <View style={styles.commentContent}>
                      {/* Cabecera del comentario */}
                      <View style={styles.commentHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                          <Text style={styles.authorName} numberOfLines={1}>
                            {displayNameOf(author)}
                          </Text>
                          {isUserAdmin(author) && <OfficialBadge size="xs" />}
                          {isCreator && (
                            <View style={styles.creatorTag}>
                              <Text style={styles.creatorTagText}>Autor</Text>
                            </View>
                          )}
                          <Text style={styles.timeText}>{timeAgo(comment.created_at)}</Text>
                        </View>
                      </View>

                      {/* Cuerpo del comentario o modo edición */}
                      {isEditing ? (
                        <View style={styles.editContainer}>
                          <TextInput
                            style={styles.editInput}
                            value={editingText}
                            onChangeText={setEditingText}
                            multiline
                            maxLength={1000}
                            autoFocus
                          />
                          <View style={styles.editActionsRow}>
                            <Pressable
                              onPress={() => handleSaveEdit(comment.id)}
                              disabled={updateComment.isPending}
                              style={styles.editSaveBtn}
                              hitSlop={4}
                            >
                              {updateComment.isPending ? (
                                <ActivityIndicator size="small" color="#000" />
                              ) : (
                                <Text style={styles.editSaveBtnText}>Guardar</Text>
                              )}
                            </Pressable>
                            <Pressable
                              onPress={handleCancelEdit}
                              disabled={updateComment.isPending}
                              style={styles.editCancelBtn}
                              hitSlop={4}
                            >
                              <Text style={styles.editCancelBtnText}>Cancelar</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        renderCommentBody(comment.body)
                      )}

                      {/* Acciones inferiores (Edit, Reply, Delete o Corazón + Reply) */}
                      {!isEditing && (
                        <View style={styles.commentActionsRow}>
                          {isAuthorOfComment ? (
                            <>
                              <Pressable
                                hitSlop={6}
                                onPress={() => handleStartEdit(comment)}
                                accessibilityRole="button"
                                accessibilityLabel="Editar comentario"
                              >
                                <Text style={styles.actionTextBold}>Edit</Text>
                              </Pressable>

                              <Pressable
                                hitSlop={6}
                                onPress={() => handleReply(comment)}
                                accessibilityRole="button"
                                accessibilityLabel="Responder comentario"
                              >
                                <Text style={styles.actionTextBold}>Reply</Text>
                              </Pressable>

                              <Pressable
                                hitSlop={6}
                                onPress={() => handleDelete(comment.id)}
                                accessibilityRole="button"
                                accessibilityLabel="Eliminar comentario"
                              >
                                <Text style={[styles.actionTextBold, styles.actionTextDelete]}>
                                  Delete
                                </Text>
                              </Pressable>
                            </>
                          ) : (
                            <>
                              {/* Corazón para usuarios externos funcional */}
                              <Pressable
                                hitSlop={6}
                                onPress={() => handleToggleLike(comment.id)}
                                style={styles.likeActionBtn}
                                accessibilityRole="button"
                                accessibilityLabel={isLikedByMe ? 'Quitar me gusta' : 'Dar me gusta'}
                              >
                                <Heart
                                  size={15}
                                  color={isLikedByMe ? '#F43F5E' : 'rgba(255,255,255,0.45)'}
                                  fill={isLikedByMe ? '#F43F5E' : 'transparent'}
                                  strokeWidth={2}
                                />
                                {likesCount > 0 && (
                                  <Text
                                    style={[
                                      styles.likeCountText,
                                      isLikedByMe && { color: '#F43F5E' },
                                    ]}
                                  >
                                    {likesCount}
                                  </Text>
                                )}
                              </Pressable>

                              {/* Responder en negrita */}
                              <Pressable
                                hitSlop={6}
                                onPress={() => handleReply(comment)}
                                accessibilityRole="button"
                                accessibilityLabel="Responder comentario"
                              >
                                <Text style={styles.actionTextBold}>Reply</Text>
                              </Pressable>

                              {/* Si es dueño del elemento también puede moderar/borrar */}
                              {isItemOwner && (
                                <Pressable
                                  hitSlop={6}
                                  onPress={() => handleDelete(comment.id)}
                                  accessibilityRole="button"
                                  accessibilityLabel="Eliminar comentario"
                                >
                                  <Text style={[styles.actionTextBold, styles.actionTextDelete]}>
                                    Delete
                                  </Text>
                                </Pressable>
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* Selector de amigos para menciones con @ */}
          {showMentionPicker && (
            <View style={styles.mentionPickerContainer}>
              <View style={styles.mentionPickerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AtSign size={13} color={gold[400]} />
                  <Text style={styles.mentionPickerTitle}>Mencionar a un amigo</Text>
                </View>
                <Pressable
                  hitSlop={6}
                  onPress={() => setShowMentionPicker(false)}
                  style={styles.mentionPickerClose}
                >
                  <X size={14} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <FlatList
                data={matchingFriends}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="always"
                style={styles.mentionList}
                ListEmptyComponent={
                  <View style={styles.mentionEmpty}>
                    <Text style={styles.mentionEmptyText}>
                      {mentionFilter ? 'No se encontraron personas' : 'No tienes amigos añadidos aún'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.mentionItem,
                      pressed && styles.mentionItemPressed,
                    ]}
                    onPress={() => handleSelectMention(item)}
                  >
                    <Avatar
                      uri={item.avatar_url}
                      initials={initialsOf(item)}
                      size="sm"
                    />
                    <View style={styles.mentionItemTextCol}>
                      <Text style={styles.mentionItemName} numberOfLines={1}>
                        {displayNameOf(item)}
                      </Text>
                      {item.username && (
                        <Text style={styles.mentionItemHandle} numberOfLines={1}>
                          @{item.username}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )}
              />
            </View>
          )}

          {/* Banner de respuesta si se seleccionó Responder */}
          {replyingTo && (
            <View style={styles.replyBanner}>
              <View style={styles.replyBannerLeft}>
                <CornerDownRight size={14} color={gold[400]} />
                <Text style={styles.replyBannerText} numberOfLines={1}>
                  Respondiendo a{' '}
                  <Text style={{ fontFamily: fontFamily.semibold, color: gold[400] }}>
                    {replyingTo.username ? `@${replyingTo.username}` : replyingTo.authorName}
                  </Text>
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => setReplyingTo(null)}
                style={styles.replyCancelBtn}
                accessibilityLabel="Cancelar respuesta"
              >
                <X size={15} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          )}

          {/* Barra inferior para escribir comentario */}
          <View style={[styles.inputBar, isKeyboardVisible && { paddingBottom: 10 }]}>
            {user && (
              <Avatar
                uri={currentUserProfile.avatar_url}
                initials={initialsOf(currentUserProfile)}
                size="sm"
              />
            )}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder={
                  replyingTo
                    ? `Responde a @${replyingTo.username || replyingTo.authorName}...`
                    : 'Añade un comentario (usa @ para mencionar)...'
                }
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={text}
                onChangeText={handleTextChange}
                multiline
                maxLength={1000}
              />
              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || addComment.isPending}
                style={[
                  styles.sendBtn,
                  text.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                hitSlop={6}
                accessibilityLabel="Publicar comentario"
              >
                {addComment.isPending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Send size={15} color={text.trim() ? '#000' : 'rgba(255,255,255,0.3)'} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetContent: {
    maxHeight: '85%',
    minHeight: '45%',
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  sheetContentKeyboard: {
    minHeight: 0,
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.16)',
  },
  countBadgeText: {
    color: gold[400],
    fontSize: 11,
    fontFamily: fontFamily.semibold,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
  },
  emptyContainerKeyboard: {
    paddingVertical: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 14,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Foto de perfil a la izquierda, alineada con el nombre del usuario
    gap: 12,
  },
  replyCommentRow: {
    marginLeft: 36,
    position: 'relative',
    marginTop: -4,
  },
  replyThreadConnector: {
    position: 'absolute',
    left: -18,
    top: 6,
    bottom: '55%',
    width: 12,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderLeftColor: 'rgba(212, 175, 55, 0.35)',
    borderBottomColor: 'rgba(212, 175, 55, 0.35)',
    borderBottomLeftRadius: 8,
  },
  commentContent: {
    flex: 1, // Sin caja, sin marco, texto limpio y fluido
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  authorName: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: fontFamily.semibold,
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
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: fontFamily.regular,
  },
  commentText: {
    color: '#F2EFE8',
    fontSize: 14,
    fontFamily: fontFamily.regular,
    lineHeight: 20,
  },
  mentionHighlight: {
    color: gold[400],
    fontFamily: fontFamily.semibold,
  },
  commentActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  actionTextBold: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.2,
  },
  actionTextDelete: {
    color: 'rgba(248, 113, 113, 0.85)',
  },
  likeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  likeCountText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  toggleRepliesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 46,
    marginTop: -4,
    marginBottom: 4,
    gap: 8,
  },
  toggleRepliesLine: {
    width: 22,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  toggleRepliesText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  toggleRepliesTextActive: {
    color: gold[400],
  },
  editContainer: {
    marginTop: 4,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: gold[400],
    color: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    minHeight: 50,
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  editSaveBtn: {
    backgroundColor: gold[400],
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editSaveBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  editCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editCancelBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  mentionPickerContainer: {
    maxHeight: 180,
    backgroundColor: '#19191D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.3)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  mentionPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  mentionPickerTitle: {
    color: gold[400],
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mentionPickerClose: {
    padding: 2,
  },
  mentionList: {
    maxHeight: 140,
  },
  mentionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mentionItemPressed: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  mentionItemTextCol: {
    flex: 1,
  },
  mentionItemName: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
  mentionItemHandle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: fontFamily.regular,
    marginTop: 1,
  },
  mentionEmpty: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  mentionEmptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 175, 55, 0.2)',
  },
  replyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  replyBannerText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontFamily: fontFamily.regular,
  },
  replyCancelBtn: {
    padding: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#161618',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    minHeight: 42,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontFamily: fontFamily.regular,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: gold[400],
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});
