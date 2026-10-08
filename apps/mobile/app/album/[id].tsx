import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Share, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Share as ShareIcon, MoreHorizontal, Lock, Users, Plus, Check } from 'lucide-react-native';
import { useAlbumDetail, useDeleteAlbumDetail, TaskItem } from '../../src/services/api/albumsService';

const GRADIENTS = {
  aurora: ['#0E4B43', '#1F8560'],
  atardecer: ['#F4A460', '#C8602F'],
  cielo: ['#3A78C4', '#8CC8F4'],
  violeta: ['#5B2F98', '#2E1A5E'],
  dorado: ['#3A2F18', '#5E4E1F'],
};

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { data: album, isLoading, isError, refetch, isRefetching } = useAlbumDetail(id || '1');
  const deleteMutation = useDeleteAlbumDetail();

  const handleShare = async () => {
    if (!album) return;
    try {
      await Share.share({
        message: `Mira mi álbum «${album.title}» en TheBucketList`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMore = () => {
    Alert.alert(
      'Opciones',
      '',
      [
        { text: 'Editar álbum', onPress: () => router.push(`/(modals)/create-album?id=${id}`) },
        { 
          text: 'Eliminar álbum', 
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '¿Eliminar este álbum?',
              'Las tareas pasarán a Sin álbum.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { 
                  text: 'Eliminar álbum', 
                  style: 'destructive', 
                  onPress: () => {
                    deleteMutation.mutate(id || '1', {
                      onSuccess: () => router.back(),
                    });
                  } 
                }
              ]
            );
          }
        },
        { text: 'Cancelar', style: 'cancel' }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D0D0D' }]}>
        <ActivityIndicator color="#D4B13A" size="large" />
      </View>
    );
  }

  if (isError || !album) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D0D0D' }]}>
        <Text style={styles.errorText}>No se pudo cargar el álbum</Text>
      </View>
    );
  }

  const { title, coverKey, isShared, tasks } = album;
  const pendientes = tasks.filter(t => !t.isCompleted).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  const hechas = tasks.filter(t => t.isCompleted);
  
  const total = tasks.length;
  const completedCount = hechas.length;
  const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const gradientColors = GRADIENTS[coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora;
  const heroColors = [gradientColors[0], gradientColors[1], '#0D0D0D'] as readonly [string, string, ...string[]];
  const statusLabel = total === 0 ? 'En curso' : (completedCount === total ? 'Completado' : 'En curso');

  const getBadgeText = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays > 1) return `${diffDays} días`;
    return `Caducó hace ${Math.abs(diffDays)} días`;
  };

  const getSubTitle = (task: TaskItem) => {
    if (task.isCompleted) return `${task.categoryName} · Completada`;
    if (task.stepsTotal && task.stepsTotal > 0) return `${task.categoryName} · ${task.stepsCompleted || 0} de ${task.stepsTotal} pasos`;
    if (task.location) return `${task.categoryName} · ${task.location}`;
    return `${task.categoryName} · Sin fecha`;
  };

  const renderTask = (task: TaskItem) => {
    const isDone = task.isCompleted;
    const thumbGradient = (GRADIENTS[task.coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora) as unknown as readonly [string, string, ...string[]];
    const isDiagonal = task.coverKey === 'dorado';
    const subTitle = getSubTitle(task);
    const badge = getBadgeText(task.dueDate);

    return (
      <Pressable 
        key={task.id} 
        style={styles.taskCard} 
        onPress={() => router.push(`/bucket/${task.id}`)}
        accessibilityRole="button"
      >
        <View style={[styles.taskThumbContainer, isDone && { opacity: 0.5 }]}>
          <LinearGradient
            colors={thumbGradient}
            start={isDiagonal ? {x: 0, y: 0} : {x: 0.5, y: 0}}
            end={isDiagonal ? {x: 1, y: 1} : {x: 0.5, y: 1}}
            style={styles.taskThumb}
          />
        </View>
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, isDone && { color: '#BDB7AA' }]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={styles.taskSub}>{subTitle}</Text>
          {!isDone && task.stepsTotal && task.stepsTotal > 0 && (
            <View style={styles.taskStepsTrack}>
              <View style={[styles.taskStepsFill, { width: `${((task.stepsCompleted || 0) / task.stepsTotal) * 100}%` }]} />
            </View>
          )}
        </View>
        {isDone ? (
          <View style={styles.checkCircle}>
            <Check size={16} color="#0D0D0D" strokeWidth={3} />
          </View>
        ) : (
          badge && (
            <View style={styles.taskBadge}>
              <Text style={styles.taskBadgeText}>{badge}</Text>
            </View>
          )
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#D4B13A" />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={heroColors}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable 
            accessibilityRole="button" 
            accessibilityLabel="Volver" 
            style={[styles.heroBtn, { left: 20, top: Math.max(52, insets.top) }]} 
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
          </Pressable>
          <Pressable 
            accessibilityRole="button" 
            accessibilityLabel="Compartir" 
            style={[styles.heroBtn, { right: 64, top: Math.max(52, insets.top) }]} 
            onPress={handleShare}
          >
            <ShareIcon size={22} color="#F3EEE3" strokeWidth={1.8} />
          </Pressable>
          <Pressable 
            accessibilityRole="button" 
            accessibilityLabel="Más opciones" 
            style={[styles.heroBtn, { right: 12, top: Math.max(52, insets.top) }]} 
            onPress={handleMore}
          >
            <MoreHorizontal size={22} color="#F3EEE3" strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* Chips */}
        <View style={styles.chipsRow}>
          <View style={[styles.chip, styles.chipStatus]}>
            <Text style={styles.chipStatusText}>{statusLabel}</Text>
          </View>
          <View style={styles.chip}>
            {isShared ? (
              <>
                <Users size={16} color="#F3EEE3" strokeWidth={1.8} />
                <Text style={styles.chipText}>Compartido</Text>
              </>
            ) : (
              <>
                <Lock size={16} color="#F3EEE3" strokeWidth={1.8} />
                <Text style={styles.chipText}>Privado</Text>
              </>
            )}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
          <View style={styles.progressRight}>
            <Text style={styles.progressTitle}>Progreso del álbum</Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSub}>{completedCount} de {total} tareas completadas</Text>
          </View>
        </View>

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleLeft}>
                <Text style={{ color: '#D4B13A' }}>PENDIENTES</Text>
                <Text style={{ color: '#FFF' }}> · {pendientes.length}</Text>
              </Text>
              <Pressable style={styles.addBtn} onPress={() => router.push(`/add-task?albumId=${id}`)}>
                <Plus size={16} color="#D4B13A" strokeWidth={2} />
                <Text style={styles.addBtnText}>Añadir</Text>
              </Pressable>
            </View>
            <View style={styles.taskList}>
              {pendientes.map(renderTask)}
            </View>
          </View>
        )}

        {/* Hechas */}
        {hechas.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleLeft}>
                <Text style={{ color: '#D4B13A' }}>HECHAS</Text>
                <Text style={{ color: '#FFF' }}> · {hechas.length}</Text>
              </Text>
            </View>
            <View style={styles.taskList}>
              {hechas.map(renderTask)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(30, insets.bottom) }]}>
        <Pressable style={styles.btnEdit} onPress={() => router.push(`/(modals)/create-album?id=${id}`)}>
          <Text style={styles.btnEditText}>Editar</Text>
        </Pressable>
        <Pressable style={styles.btnAdd} onPress={() => router.push(`/add-task?albumId=${id}`)}>
          <Text style={styles.btnAddText}>Añadir tarea</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#A0A0A0',
  },
  scroll: {
    flex: 1,
  },
  hero: {
    height: 200,
    width: '100%',
  },
  heroBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13,13,13,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipStatus: {
    borderColor: '#D4B13A',
    backgroundColor: '#2C2512',
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F3EEE3',
  },
  chipStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#D4B13A',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    lineHeight: 40,
    color: '#F3EEE3',
    marginTop: 14,
    marginHorizontal: 20,
  },
  progressCard: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  progressPercent: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: '#D4B13A',
  },
  progressRight: {
    flex: 1,
  },
  progressTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    marginTop: 8,
    marginBottom: 6,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D4B13A',
  },
  progressSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleLeft: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  taskList: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  taskCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 10,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskThumbContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskThumb: {
    flex: 1,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: '#F3EEE3',
  },
  taskSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 3,
  },
  taskStepsTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A2A',
    marginTop: 8,
    width: '100%',
  },
  taskStepsFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#D4B13A',
  },
  taskBadge: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6B5A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#D4B13A',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D4B13A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  btnEdit: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4B13A',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnEditText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#D4B13A',
  },
  btnAdd: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#D4B13A',
    flex: 1.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#0D0D0D',
  },
});
