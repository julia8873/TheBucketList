import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  CheckCircle,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react-native';
import { Avatar, PageTitle, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import {
  useAdminReports,
  useDismissReport,
  useAdminDeleteUser,
} from '../../src/hooks/useBlockReport';
import { UserReportItem } from '../../src/services/api/blockReport';

export default function AdminReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isAdmin = useIsAdmin();

  const { data: reports = [], isLoading } = useAdminReports();
  const dismissMutation = useDismissReport();
  const deleteUserMutation = useAdminDeleteUser();

  const handleDismiss = (report: UserReportItem) => {
    Alert.alert(
      'Desestimar reporte',
      '¿Deseas marcar este reporte como revisado sin tomar acciones disciplinarias?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desestimar',
          onPress: () => dismissMutation.mutate(report.id),
        },
      ]
    );
  };

  const handleDeleteUser = (report: UserReportItem) => {
    const reportedUsername = report.reported?.username || 'este usuario';
    const reportedId = report.reported?.id;

    if (!reportedId) {
      Alert.alert('Error', 'No se encontró el ID del usuario reportado.');
      return;
    }

    Alert.alert(
      `⚠️ ¿Eliminar cuenta de @${reportedUsername}?`,
      'Esta acción eliminará de forma PERMANENTE e IRREVERSIBLE la cuenta del usuario infractor, sus tareas, álbumes y acceso a la plataforma.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Cuenta Definitivamente',
          style: 'destructive',
          onPress: () => deleteUserMutation.mutate(reportedId),
        },
      ]
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 20, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <ShieldAlert color="#EF4444" size={56} />
        <Text style={[styles.restrictedTitle, { color: theme.colors.foreground }]}>Acceso Restringido</Text>
        <Text style={[styles.restrictedText, { color: theme.colors.foregroundMuted }]}>
          Este panel de moderación solo está disponible para usuarios con rol de administrador.
        </Text>
        <Pressable
          style={[styles.backBtnModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.backBtnText, { color: theme.colors.foreground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft color={theme.colors.foreground} size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <PageTitle gold="Reportes" rest=" de usuarios" />
        </View>
      </View>

      <Text style={[styles.description, { color: theme.colors.foregroundMuted }]}>
        Gestiona las denuncias enviadas por la comunidad y decide qué medidas tomar.
      </Text>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#D4AF37" />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isPending = !item.resolved && item.status === 'pending';
            const reported = item.reported;
            const reporter = item.reporter;

            return (
              <View
                style={[
                  styles.reportCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  !isPending && { opacity: 0.75 },
                ]}
              >
                {/* Cabecera del reporte */}
                <View style={styles.reportTopRow}>
                  <View style={styles.reasonBadge}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <Text style={styles.reasonBadgeText}>{item.reason}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: theme.dark ? '#202020' : (theme.colors.surfaceElevated ?? '#ECE8DF') },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: isPending ? '#D4AF37' : '#10B981' }]}>
                      {isPending ? 'Pendiente' : item.status === 'resolved_deleted' ? 'Cuenta borrada' : 'Revisado'}
                    </Text>
                  </View>
                </View>

                {/* Usuarios involucrados */}
                <View
                  style={[
                    styles.usersBox,
                    { backgroundColor: theme.dark ? '#1C1C1C' : (theme.colors.surfaceElevated ?? '#F2EFE8') },
                  ]}
                >
                  {/* Usuario denunciado */}
                  <View style={styles.userSection}>
                    <Text style={[styles.userSectionLabel, { color: theme.colors.foregroundMuted }]}>USUARIO DENUNCIADO</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.userRow,
                        pressed && { opacity: 0.65 },
                      ]}
                      onPress={() => {
                        if (reported?.id) {
                          router.push(`/profile/${reported.id}` as any);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver perfil de ${reported?.username || 'usuario denunciado'}`}
                    >
                      <Avatar
                        source={reported?.avatar_url ? { uri: reported.avatar_url } : undefined}
                        fallback={reported?.display_name?.charAt(0) || reported?.username?.charAt(0) || '?'}
                        size="sm"
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[styles.userName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {reported?.display_name || reported?.username || 'Usuario'}
                        </Text>
                        <Text style={[styles.userHandle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                          @{reported?.username || 'desconocido'}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={theme.colors.foregroundMuted} />
                    </Pressable>
                  </View>

                  {/* Usuario denunciante */}
                  <View style={styles.userSection}>
                    <Text style={[styles.userSectionLabel, { color: theme.colors.foregroundMuted }]}>REPORTADO POR</Text>
                    <Pressable
                      style={({ pressed }) => [
                        styles.userRow,
                        pressed && { opacity: 0.65 },
                      ]}
                      onPress={() => {
                        if (reporter?.id) {
                          router.push(`/profile/${reporter.id}` as any);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver perfil de ${reporter?.username || 'usuario denunciante'}`}
                    >
                      <Avatar
                        source={reporter?.avatar_url ? { uri: reporter.avatar_url } : undefined}
                        fallback={reporter?.display_name?.charAt(0) || reporter?.username?.charAt(0) || '?'}
                        size="sm"
                      />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={[styles.userName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {reporter?.display_name || reporter?.username || 'Usuario'}
                        </Text>
                        <Text style={[styles.userHandle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                          @{reporter?.username || 'desconocido'}
                        </Text>
                      </View>
                      <ChevronRight size={14} color={theme.colors.foregroundMuted} />
                    </Pressable>
                  </View>
                </View>

                {/* Detalles del reporte si existen */}
                {item.details ? (
                  <View
                    style={[
                      styles.detailsBox,
                      {
                        backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text style={[styles.detailsLabel, { color: theme.colors.foregroundMuted }]}>Mensaje del denunciante:</Text>
                    <Text style={[styles.detailsText, { color: theme.colors.foreground }]}>"{item.details}"</Text>
                  </View>
                ) : null}

                {/* Botones de moderación */}
                {isPending && (
                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[
                        styles.dismissBtn,
                        {
                          backgroundColor: theme.dark ? '#242424' : (theme.colors.surfaceElevated ?? '#ECE8DF'),
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => handleDismiss(item)}
                      disabled={dismissMutation.isPending || deleteUserMutation.isPending}
                    >
                      <CheckCircle size={15} color={theme.colors.foregroundMuted} />
                      <Text style={[styles.dismissBtnText, { color: theme.colors.foreground }]}>Desestimar</Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteUserBtn}
                      onPress={() => handleDeleteUser(item)}
                      disabled={dismissMutation.isPending || deleteUserMutation.isPending}
                    >
                      <Trash2 size={15} color="#FFF" />
                      <Text style={styles.deleteUserBtnText}>Borrar cuenta</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <ShieldCheck size={36} color="#10B981" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>Bandeja de moderación limpia</Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
                No hay ningún reporte pendiente de revisión en este momento.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  adminBadgeText: {
    color: '#D4AF37',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  description: {
    color: '#8F8F8F',
    fontSize: 13,
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  reportCard: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 16,
  },
  reportTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  reasonBadgeText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: fontFamily.semibold,
  },
  statusBadge: {
    backgroundColor: '#202020',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontFamily: fontFamily.medium,
  },
  usersBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  userSection: {
    flex: 1,
  },
  userSectionLabel: {
    color: '#777',
    fontSize: 10,
    fontFamily: fontFamily.semibold,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#F3EEE3',
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
  userHandle: {
    color: '#8F8F8F',
    fontSize: 11,
  },
  detailsBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  detailsLabel: {
    color: '#8F8F8F',
    fontSize: 11,
    marginBottom: 4,
  },
  detailsText: {
    color: '#CCC',
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dismissBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#242424',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  dismissBtnText: {
    color: '#AAA',
    fontSize: 13,
    fontFamily: fontFamily.medium,
  },
  deleteUserBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
  },
  deleteUserBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#F3EEE3',
    fontSize: 17,
    fontFamily: fontFamily.semibold,
  },
  emptySubtitle: {
    color: '#777',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 260,
  },
  restrictedTitle: {
    color: '#F3EEE3',
    fontSize: 20,
    fontFamily: fontFamily.bold,
    marginTop: 16,
  },
  restrictedText: {
    color: '#8F8F8F',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backBtnModal: {
    backgroundColor: '#222',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontFamily: fontFamily.semibold,
  },
});
