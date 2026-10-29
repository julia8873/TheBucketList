import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, Modal, Pressable, FlatList, TextInput, Keyboard, ScrollView, Platform, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import {
  MessageCircle,
  X,
  Send,
  CornerDownRight,
  AtSign,
} from 'lucide-react-native';
import { Avatar, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnections, usePeopleSearch } from '../hooks/useFriends';
import { displayNameOf, initialsOf } from '../utils/initials';
import { useTranslation } from '@bucketlist/shared';
import { ReportModal } from './ReportModal';
import { CommentThreadView } from './comments/CommentRow';
import { useCommentsController } from './comments/useCommentsController';

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
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const effectiveTargetType: 'bucket' | 'album' = targetType || (albumId ? 'album' : 'bucket');
  const effectiveId = (effectiveTargetType === 'album' ? albumId : bucketId) || '';
  const effectiveTitle = (effectiveTargetType === 'album' ? (albumTitle || bucketTitle) : (bucketTitle || albumTitle)) || '';
  const effectiveOwnerId = effectiveTargetType === 'album' ? (albumOwnerId || bucketOwnerId) : (bucketOwnerId || albumOwnerId);

  const inputRef = useRef<TextInput>(null);
  const flatListRef = useRef<FlatList>(null);

  // Lógica compartida con la sección de comentarios de la tarea/álbum (mismo árbol y mismas acciones)
  const ctrl = useCommentsController({
    targetId: effectiveId,
    targetType: effectiveTargetType,
    ownerId: effectiveOwnerId,
    onReplyStart: () => setTimeout(() => inputRef.current?.focus(), 100),
  });
  const { user, profile, comments, isLoading, threads, text, setText, replyingTo } = ctrl;

  // Estado para autocompletar menciones con @
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

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
    display_name: (profile?.display_name || profile?.username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.display_name) as string | undefined,
    username: (profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0]) as string | undefined,
    avatar_url: (profile?.avatar_url ?? user?.user_metadata?.avatar_url) as string | undefined,
  };

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

  // Al ir a comentar, la lista baja hasta los últimos comentarios (también tras abrirse el teclado,
  // que cambia el alto disponible). Si se está respondiendo a uno concreto, no se mueve.
  const scrollToLatest = () => {
    if (replyingTo) return;
    [80, 350].forEach((ms) =>
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), ms),
    );
  };

  useEffect(() => {
    if (isKeyboardVisible) scrollToLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKeyboardVisible, keyboardHeight]);

  const handleSend = async () => {
    setShowMentionPicker(false);
    setMentionFilter('');
    const ok = await ctrl.send();
    if (ok) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Con edge-to-edge (Android) el sistema no redimensiona la ventana: se reserva manualmente
          el alto del teclado para que la hoja y la barra de escribir queden encima. */}
      <View
        style={[
          styles.overlay,
          isKeyboardVisible && { paddingBottom: keyboardHeight, paddingTop: insets.top + 8 },
        ]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
        />
        <View style={[styles.sheetContent, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }, { maxHeight: isKeyboardVisible ? Math.min(Math.round(windowHeight * 0.7), windowHeight - keyboardHeight - insets.top - 8) : Math.round(windowHeight * 0.7) }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconCircle}>
                <MessageCircle size={18} color={gold[400]} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>{t('comments.modal_title')}</Text>
                  {comments.length > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{comments.length}</Text>
                    </View>
                  )}
                </View>
                {effectiveTitle ? (
                  <Text style={[styles.headerSubtitle, { color: theme.colors.foregroundMuted, textAlign: 'center' }]} numberOfLines={1}>
                    {effectiveTitle}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* Lista de comentarios sin caja exterior, con fotos a la izquierda y respuestas plegables */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={gold[400]} size="small" />
            </View>
          ) : comments.length === 0 ? (
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
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
              <Text style={styles.emptyTitle}>{t('comments.empty_title')}</Text>
              {!isKeyboardVisible && (
                <Text style={styles.emptySubtitle}>
                  {t('comments.empty_subtitle')}
                </Text>
              )}
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              style={{ flexGrow: 0, flexShrink: 1 }}
              data={threads}
              keyExtractor={(thread) => thread.root.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              renderItem={({ item }) => <CommentThreadView thread={item} ctrl={ctrl} />}
            />
          )}

          {/* Selector de amigos para menciones con @ */}
          {showMentionPicker && (
            <View style={styles.mentionPickerContainer}>
              <View style={styles.mentionPickerHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AtSign size={13} color={gold[400]} />
                  <Text style={styles.mentionPickerTitle}>{t('comments.mention_friend')}</Text>
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
                      {mentionFilter ? t('comments.mention_empty_query') : t('comments.mention_empty_none')}
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
                  {t('comments.replying_to')}{' '}
                  <Text style={{ fontFamily: fontFamily.semibold, color: gold[400] }}>
                    {replyingTo.username ? `@${replyingTo.username}` : replyingTo.authorName}
                  </Text>
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => {
                  ctrl.cancelReply();
                  setText('');
                }}
                style={styles.replyCancelBtn}
                accessibilityLabel={t('comments.cancel_reply')}
              >
                <X size={15} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
          )}

          {/* Barra inferior para escribir comentario */}
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
              },
              // Con teclado abierto se deja un margen extra para que la caja no quede pegada a él
              isKeyboardVisible
                ? { paddingBottom: 22 }
                : { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
            {user && (
              <Avatar
                uri={currentUserProfile.avatar_url}
                initials={initialsOf(currentUserProfile)}
                size="sm"
              />
            )}
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.foreground }]}
                placeholder={
                  replyingTo
                    ? t('comments.reply_placeholder', { username: replyingTo.username || replyingTo.authorName })
                    : t('comments.input_placeholder_mentions')
                }
                placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.45)' : 'rgba(40,36,30,0.5)'}
                value={text}
                onChangeText={handleTextChange}
                onFocus={scrollToLatest}
                multiline
                maxLength={1000}
              />
              <Pressable
                onPress={handleSend}
                disabled={!text.trim() || ctrl.isSending}
                style={[
                  styles.sendBtn,
                  text.trim() ? styles.sendBtnActive : styles.sendBtnDisabled,
                ]}
                hitSlop={6}
                accessibilityLabel={t('comments.post_comment')}
              >
                {ctrl.isSending ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Send size={15} color={text.trim() ? '#000' : (theme.dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)')} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <ReportModal
        visible={!!ctrl.reportingComment}
        onClose={() => ctrl.setReportingComment(null)}
        kind="comment"
        subject={ctrl.reportingComment ? t('comments.comment_by_author', { author: ctrl.reportingComment.author }) : undefined}
        isLoading={ctrl.isReporting}
        onSubmit={ctrl.submitReport}
      />
    </Modal>
  );
}

const styles = themedStyleSheet({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetContent: {
    // Se ajusta al contenido (la barra de escribir queda justo bajo el último comentario)
    // y solo crece hasta el 85% de la pantalla; a partir de ahí la lista hace scroll.
    maxHeight: '70%',
    backgroundColor: '#121214',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  sheetContentKeyboard: {
    // Con teclado: el overlay ya reserva su alto, la hoja se queda justo encima de él.
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    flexGrow: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
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
    paddingHorizontal: 12,
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
    paddingHorizontal: 12,
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
