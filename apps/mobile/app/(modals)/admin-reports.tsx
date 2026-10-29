import React from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Ban,
  UserCheck,
  FileText,
  FolderOpen,
  MessageCircle,
  User as UserIcon,
  Eye,
} from 'lucide-react-native';
import { Avatar, PageTitle, fontFamily, confirm, useTheme } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import {
  useAdminReports,
  useDismissReport,
  useAdminDeleteUser,
  useAdminRemoveReportedContent,
  useAdminSuspendUser,
  useAdminUnsuspendUser,
} from '../../src/hooks/useBlockReport';
import type { UserReportItem, ReportTargetType } from '../../src/services/api/blockReport';
import { useTranslation } from '@bucketlist/shared';

const TARGET_LABEL_KEY: Record<ReportTargetType, string> = {
  user: 'admin_reports.target_user',
  bucket: 'admin_reports.target_bucket',
  album: 'admin_reports.target_album',
  comment: 'admin_reports.target_comment',
};

function TargetIcon({ type, color }: { type: ReportTargetType; color: string }) {
  if (type === 'bucket') return <FileText size={13} color={color} />;
  if (type === 'album') return <FolderOpen size={13} color={color} />;
  if (type === 'comment') return <MessageCircle size={13} color={color} />;
  return <UserIcon size={13} color={color} />;
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const isAdmin = useIsAdmin();

  const { data: reports = [], isLoading } = useAdminReports();
  const dismissMutation = useDismissReport();
  const deleteUserMutation = useAdminDeleteUser();
  const removeContentMutation = useAdminRemoveReportedContent();
  const suspendMutation = useAdminSuspendUser();
  const unsuspendMutation = useAdminUnsuspendUser();

  const busy =
    dismissMutation.isPending ||
    deleteUserMutation.isPending ||
    removeContentMutation.isPending ||
    suspendMutation.isPending ||
    unsuspendMutation.isPending;

  const handleDismiss = async (report: UserReportItem) => {
    const ok = await confirm.ask({
      title: t('admin_reports.dismiss_title'),
      message: t('admin_reports.dismiss_msg'),
      confirmLabel: t('admin_reports.dismiss'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) dismissMutation.mutate(report.id);
  };

  const handleRemoveContent = async (report: UserReportItem) => {
    const kind = report.target_type === 'bucket' ? 'bucket' : report.target_type === 'album' ? 'album' : 'comment';
    const ok = await confirm.ask({
      title: t(`admin_reports.remove_title_${kind}`),
      message: t(`admin_reports.remove_msg_${kind}`),
      confirmLabel: t('admin_reports.remove_confirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) removeContentMutation.mutate(report.id);
  };

  const handleSuspend = async (report: UserReportItem) => {
    const reportedId = report.reported?.id;
    if (!reportedId) return;
    const ok = await confirm.ask({
      title: t('admin_reports.suspend_title', { username: report.reported?.username || t('admin_reports.this_user') }),
      message: t('admin_reports.suspend_msg'),
      confirmLabel: t('admin_reports.suspend_confirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (ok) suspendMutation.mutate({ userId: reportedId, reason: report.reason });
  };

  const handleUnsuspend = async (report: UserReportItem) => {
    const reportedId = report.reported?.id;
    if (!reportedId) return;
    const ok = await confirm.ask({
      title: t('admin_reports.unsuspend_title', { username: report.reported?.username || t('admin_reports.this_user') }),
      message: t('admin_reports.unsuspend_msg'),
      confirmLabel: t('admin_reports.unsuspend_confirm'),
      cancelLabel: t('common.cancel'),
    });
    if (ok) unsuspendMutation.mutate(reportedId);
  };

  const handleDeleteUser = async (report: UserReportItem) => {
    const reportedId = report.reported?.id;
    if (!reportedId) {
      confirm.show({ title: t('common.error'), message: t('admin_reports.user_id_missing'), tone: 'error', confirmLabel: t('admin_reports.accept'), cancelLabel: t('admin_reports.close') });
      return;
    }
    const ok = await confirm.ask({
      title: t('admin_reports.delete_user_title', { username: report.reported?.username || t('admin_reports.this_user') }),
      message: t('admin_reports.delete_user_msg'),
      confirmLabel: t('admin_reports.delete_user_confirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      requireText: t('admin_reports.delete_user_require'),
    });
    if (ok) deleteUserMutation.mutate(reportedId);
  };

  const openTarget = (report: UserReportItem) => {
    if (report.target_type === 'bucket' && report.bucket_id) router.push(`/bucket/${report.bucket_id}` as any);
    else if (report.target_type === 'album' && report.album_id) router.push(`/album/${report.album_id}` as any);
    else if (report.target_type === 'comment') {
      if (report.bucket_id) router.push(`/bucket/${report.bucket_id}` as any);
      else if (report.album_id) router.push(`/album/${report.album_id}` as any);
    }
  };

  const statusLabel = (r: UserReportItem, pending: boolean) => {
    if (pending) return t('admin_reports.status_pending');
    if (r.status === 'resolved_deleted') return t('admin_reports.status_deleted');
    if (r.status === 'resolved_suspended') return t('admin_reports.status_suspended');
    if (r.status === 'resolved_content_removed') return t('admin_reports.status_removed');
    return t('admin_reports.status_reviewed');
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, styles.restricted, { backgroundColor: c.background, paddingTop: insets.top + 20 }]}>
        <ShieldAlert color={c.error} size={56} />
        <Text style={[styles.restrictedTitle, { color: c.foreground }]}>{t('admin_reports.restricted_title')}</Text>
        <Text style={[styles.restrictedText, { color: c.foregroundMuted }]}>
          {t('admin_reports.restricted_text')}
        </Text>
        <Pressable
          style={[styles.backBtnModal, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: c.foreground }]}>{t('common.back')}</Text>
        </Pressable>
      </View>
    );
  }

  const renderUserRow = (
    label: string,
    person: UserReportItem['reporter'] | UserReportItem['reported'],
    accessibilityLabel: string,
  ) => (
    <View style={styles.userSection}>
      <Text style={[styles.userSectionLabel, { color: c.foregroundMuted }]}>{label}</Text>
      <Pressable
        style={({ pressed }) => [styles.userRow, pressed && { opacity: 0.65 }]}
        onPress={() => person?.id && router.push(`/profile/${person.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Avatar
          source={person?.avatar_url ? { uri: person.avatar_url } : undefined}
          fallback={person?.display_name?.charAt(0) || person?.username?.charAt(0) || '?'}
          size="sm"
        />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={[styles.userName, { color: c.foreground }]} numberOfLines={1}>
            {person?.display_name || person?.username || t('admin_reports.user_fallback')}
          </Text>
          <Text style={[styles.userHandle, { color: c.foregroundMuted }]} numberOfLines={1}>
            @{person?.username || t('admin_reports.unknown_handle')}
          </Text>
        </View>
        <ChevronRight size={14} color={c.foregroundMuted} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft color={c.foreground} size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <PageTitle gold={t('admin_reports.title_gold')} rest={t('admin_reports.title_rest')} />
        </View>
      </View>

      <Text style={[styles.description, { color: c.foregroundMuted }]}>
        {t('admin_reports.description')}
      </Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isPending = !item.resolved && (item.status ?? 'pending') === 'pending';
            const isContent = item.target_type !== 'user';
            const isSuspended = !!item.reported?.suspended_at;
            const canOpenTarget =
              isContent && (item.bucket_id || item.album_id) && item.status !== 'resolved_content_removed';

            return (
              <View
                style={[
                  styles.reportCard,
                  { backgroundColor: c.surface, borderColor: c.border },
                  !isPending && { opacity: 0.75 },
                ]}
              >
                <View style={styles.reportTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                    <View style={[styles.reasonBadge, { backgroundColor: c.errorBackground, borderColor: c.error }]}>
                      <AlertTriangle size={12} color={c.error} />
                      <Text style={[styles.reasonBadgeText, { color: c.error }]} numberOfLines={1}>
                        {item.reason}
                      </Text>
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
                      <TargetIcon type={item.target_type} color={c.foregroundMuted} />
                      <Text style={[styles.typeBadgeText, { color: c.foregroundMuted }]}>
                        {t(TARGET_LABEL_KEY[item.target_type])}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: c.surfaceSunken }]}>
                    <Text style={[styles.statusText, { color: isPending ? c.primary : c.success }]}>
                      {statusLabel(item, isPending)}
                    </Text>
                  </View>
                </View>

                {/* Contenido reportado */}
                {isContent ? (
                  <View style={[styles.contentBox, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
                    {item.target_title ? (
                      <Text style={[styles.contentTitle, { color: c.foreground }]} numberOfLines={2}>
                        {item.target_type === 'comment' ? t('admin_reports.comment_on', { title: item.target_title }) : item.target_title}
                      </Text>
                    ) : null}
                    {item.target_excerpt ? (
                      <Text style={[styles.contentExcerpt, { color: c.foregroundMuted }]} numberOfLines={4}>
                        {item.target_type === 'comment' ? `“${item.target_excerpt}”` : item.target_excerpt}
                      </Text>
                    ) : null}
                    {canOpenTarget ? (
                      <Pressable
                        onPress={() => openTarget(item)}
                        style={styles.openLink}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={t('admin_reports.view_content_a11y')}
                      >
                        <Eye size={14} color={c.primary} />
                        <Text style={[styles.openLinkText, { color: c.primary }]}>{t('admin_reports.view_content')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                <View style={[styles.usersBox, { backgroundColor: c.surfaceSunken }]}>
                  {renderUserRow(
                    isContent ? t('admin_reports.author') : t('admin_reports.reported_user'),
                    item.reported,
                    t('admin_reports.view_profile_of', { username: item.reported?.username || t('admin_reports.reported_user_fallback') }),
                  )}
                  {renderUserRow(
                    t('admin_reports.reported_by'),
                    item.reporter,
                    t('admin_reports.view_profile_of', { username: item.reporter?.username || t('admin_reports.reporter_fallback') }),
                  )}
                </View>

                {isSuspended ? (
                  <View style={[styles.suspendedBanner, { backgroundColor: c.errorBackground, borderColor: c.error }]}>
                    <Ban size={14} color={c.error} />
                    <Text style={[styles.suspendedText, { color: c.error }]}>{t('admin_reports.suspended_banner')}</Text>
                  </View>
                ) : null}

                {item.details ? (
                  <View style={[styles.detailsBox, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
                    <Text style={[styles.detailsLabel, { color: c.foregroundMuted }]}>{t('admin_reports.reporter_message')}</Text>
                    <Text style={[styles.detailsText, { color: c.foreground }]}>"{item.details}"</Text>
                  </View>
                ) : null}

                {/* Acciones de moderación */}
                {isPending && (
                  <View style={styles.actionsCol}>
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.dismissBtn, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}
                        onPress={() => void handleDismiss(item)}
                        disabled={busy}
                      >
                        <CheckCircle size={15} color={c.foregroundMuted} />
                        <Text style={[styles.dismissBtnText, { color: c.foreground }]}>{t('admin_reports.dismiss')}</Text>
                      </Pressable>

                      {isContent ? (
                        <Pressable
                          style={[styles.dangerBtn, { backgroundColor: c.error }]}
                          onPress={() => void handleRemoveContent(item)}
                          disabled={busy}
                        >
                          <Trash2 size={15} color={c.errorForeground} />
                          <Text style={[styles.dangerBtnText, { color: c.errorForeground }]}>{t('admin_reports.remove_content')}</Text>
                        </Pressable>
                      ) : null}
                    </View>

                    <View style={styles.actionsRow}>
                      {isSuspended ? (
                        <Pressable
                          style={[styles.outlineBtn, { borderColor: c.primary }]}
                          onPress={() => void handleUnsuspend(item)}
                          disabled={busy}
                        >
                          <UserCheck size={15} color={c.primary} />
                          <Text style={[styles.outlineBtnText, { color: c.primary }]}>{t('admin_reports.unsuspend')}</Text>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.outlineBtn, { borderColor: c.error }]}
                          onPress={() => void handleSuspend(item)}
                          disabled={busy}
                        >
                          <Ban size={15} color={c.error} />
                          <Text style={[styles.outlineBtnText, { color: c.error }]}>{t('admin_reports.suspend')}</Text>
                        </Pressable>
                      )}

                      {!isContent ? (
                        <Pressable
                          style={[styles.dangerBtn, { backgroundColor: c.error }]}
                          onPress={() => void handleDeleteUser(item)}
                          disabled={busy}
                        >
                          <Trash2 size={15} color={c.errorForeground} />
                          <Text style={[styles.dangerBtnText, { color: c.errorForeground }]}>{t('admin_reports.delete_account')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: c.successBackground }]}>
                <ShieldCheck size={36} color={c.success} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>{t('admin_reports.empty_title')}</Text>
              <Text style={[styles.emptySubtitle, { color: c.foregroundMuted }]}>
                {t('admin_reports.empty_sub')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  restricted: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 12, paddingBottom: 40, gap: 12 },
  reportCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 14,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 190,
  },
  reasonBadgeText: { fontSize: 12, fontFamily: fontFamily.semibold, flexShrink: 1 },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: fontFamily.semibold, letterSpacing: 0.4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: fontFamily.medium },
  contentBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12, gap: 6 },
  contentTitle: { fontSize: 14, fontFamily: fontFamily.semibold },
  contentExcerpt: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  openLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 2 },
  openLinkText: { fontSize: 13, fontFamily: fontFamily.semibold },
  usersBox: { flexDirection: 'row', gap: 12, borderRadius: 12, padding: 10, marginBottom: 12 },
  userSection: { flex: 1 },
  userSectionLabel: { fontSize: 10, fontFamily: fontFamily.semibold, marginBottom: 6, letterSpacing: 0.4 },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 13, fontFamily: fontFamily.medium },
  userHandle: { fontSize: 11 },
  suspendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  suspendedText: { fontSize: 12, fontFamily: fontFamily.semibold },
  detailsBox: { borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1 },
  detailsLabel: { fontSize: 11, marginBottom: 4 },
  detailsText: { fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  actionsCol: { gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  dismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  dismissBtnText: { fontSize: 13, fontFamily: fontFamily.medium },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 13, fontFamily: fontFamily.semibold },
  dangerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  dangerBtnText: { fontSize: 13, fontFamily: fontFamily.semibold },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontFamily: fontFamily.semibold },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, maxWidth: 260 },
  restrictedTitle: { fontSize: 20, fontFamily: fontFamily.bold, marginTop: 16 },
  restrictedText: { fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtnModal: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  backBtnText: { fontFamily: fontFamily.semibold },
});
