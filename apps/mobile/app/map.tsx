import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  Search,
  X,
  Compass,
  Plus,
  Minus,
  LocateFixed,
  Layers,
} from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMapTasks } from '../src/features/map/hooks/useMapTasks';
import {
  RealisticLeafletMap,
  RealisticMapRef,
  MapLayerMode,
} from '../src/features/map/components/RealisticLeafletMap';
import { TaskMapPreviewCard } from '../src/features/map/components/TaskMapPreviewCard';
import type { MapFilterType, MapTaskItem } from '../src/features/map/types';

const FILTER_OPTIONS: { id: MapFilterType; label: string; emoji: string }[] = [
  { id: 'all', label: 'Todas', emoji: '🌍' },
  { id: 'mine', label: 'Mis tareas', emoji: '📍' },
  { id: 'friends', label: 'Amigos', emoji: '👥' },
  { id: 'completed', label: 'Completadas', emoji: '✅' },
  { id: 'pending', label: 'Por hacer', emoji: '🎯' },
];

const LAYER_MODES: { id: MapLayerMode; label: string; desc: string; icon: string }[] = [
  { id: 'streets', label: 'Plano', desc: 'Calles y ciudades con alto detalle', icon: '🗺️' },
  { id: 'satellite', label: 'Satélite', desc: 'Foto satelital de alta resolución', icon: '🛰️' },
  { id: 'terrain', label: 'Relieve', desc: 'Topografía y relieve montañoso', icon: '🏔️' },
];

export default function MapScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{ initialTaskId?: string }>();

  const mapRef = useRef<RealisticMapRef | null>(null);

  const [activeFilter, setActiveFilterState] = useState<MapFilterType>('all');
  const setActiveFilter = (filter: MapFilterType) => {
    setActiveFilterState(filter);
    void AsyncStorage.setItem('@map_active_filter', filter).catch(() => undefined);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<MapTaskItem | null>(null);
  const [selectedLocationTasks, setSelectedLocationTasks] = useState<MapTaskItem[]>([]);
  const [mapType, setMapType] = useState<MapLayerMode>('streets');
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Cargar tipo de capa guardado previamente (la vista de tareas siempre inicia en 'Todas')
  React.useEffect(() => {
    AsyncStorage.getItem('@map_layer_type')
      .then((saved) => {
        if (saved && ['streets', 'satellite', 'terrain'].includes(saved)) {
          setMapType(saved as MapLayerMode);
          mapRef.current?.setMapType(saved as MapLayerMode);
        }
      })
      .catch(() => undefined);
  }, []);

  const { tasks, allTasksCount, isLoading, refetch } = useMapTasks({
    filter: activeFilter,
    searchQuery,
  });

  // Refrescar las tareas del mapa cada vez que se abre la pantalla
  useFocusEffect(
    React.useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const handleSelectTask = (task: MapTaskItem, group?: MapTaskItem[]) => {
    setSelectedTask(task);
    if (group && group.length > 0) {
      setSelectedLocationTasks(group);
    } else {
      const sameLocation = tasks.filter((t) => {
        if (t.id === task.id) return true;
        const dLat = (t.location_lat - task.location_lat) * 111139;
        const dLng = (t.location_lng - task.location_lng) * 85000;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);
        if (dist <= 3500) return true;
        // Comprobar coincidencia de nombre de ciudad si dist < 7km
        if (dist <= 7000 && t.location_text && task.location_text) {
          const loc1 = t.location_text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const loc2 = task.location_text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const words1 = loc1.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
          const words2 = loc2.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
          if (words1.some((w) => words2.includes(w))) return true;
        }
        return false;
      });
      setSelectedLocationTasks(sameLocation.length > 0 ? sameLocation : [task]);
    }
    // Centrar suavemente manteniendo el nivel de zoom actual del usuario (sin cambiar zoom)
    mapRef.current?.centerOn(task.location_lat, task.location_lng);
  };

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    // 1. Si hay tareas que coinciden en la búsqueda actual:
    if (tasks.length > 0) {
      if (tasks.length === 1) {
        const singleTask = tasks[0];
        if (singleTask) {
          setSelectedTask(singleTask);
          setSelectedLocationTasks([singleTask]);
          mapRef.current?.flyToLocation(singleTask.location_lat, singleTask.location_lng, 14);
        }
      } else {
        const coords = tasks
          .filter((t) => typeof t.location_lat === 'number' && typeof t.location_lng === 'number')
          .map((t) => ({ lat: t.location_lat, lng: t.location_lng }));
        if (coords.length > 0) {
          mapRef.current?.fitCoordinates(coords);
        }
      }
      return;
    }

    // 2. Si no hay tareas en ese lugar, buscar y hacer zoom a la ciudad / país globalmente
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'TheBucketListApp/1.0' } }
      );
      const data: any[] = await res.json();
      if (data && data.length > 0) {
        const target =
          data.find(
            (it: any) =>
              it.addresstype === 'city' ||
              it.addresstype === 'town' ||
              it.addresstype === 'municipality' ||
              it.type === 'city'
          ) || data[0];

        const lat = parseFloat(target.lat);
        const lon = parseFloat(target.lon);
        const isCountry = target.type === 'administrative' && target.addresstype === 'country';
        const targetZoom = isCountry ? 6 : 13;
        mapRef.current?.flyToLocation(lat, lon, targetZoom);
      }
    } catch (err) {
      console.warn('Error geocodificando búsqueda en el mapa:', err);
    }
  };

  // Hacer zoom automático al escribir y pausar brevemente la búsqueda
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      void handleSearchSubmit();
    }, 850);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Si se pasa una tarea inicial por params, enfocarla
  React.useEffect(() => {
    if (params.initialTaskId && tasks.length > 0) {
      const found = tasks.find((t) => t.id === params.initialTaskId);
      if (found) {
        handleSelectTask(found);
      }
    }
  }, [params.initialTaskId, tasks]);

  const selectMapType = (type: MapLayerMode) => {
    setMapType(type);
    void AsyncStorage.setItem('@map_layer_type', type).catch(() => undefined);
    mapRef.current?.setMapType(type);
    setShowLayerMenu(false);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Mapa cartográfico realista (Calles / Satélite real con Leaflet) */}
      <RealisticLeafletMap
        ref={mapRef}
        tasks={tasks}
        selectedTask={selectedTask}
        onSelectTask={handleSelectTask}
        mapType={mapType}
        isSearching={searchQuery.trim().length > 0}
      />

      {/* Capa flotante superior: Buscador y Filtros estilo Google Maps */}
      <SafeAreaView edges={['top']} style={styles.floatingHeader} pointerEvents="box-none">
        {/* Barra de búsqueda flotante */}
        <View
          style={[
            styles.searchCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityLabel="Volver"
          >
            <ChevronLeft size={24} color={theme.colors.foreground} />
          </Pressable>

          <Search size={18} color={theme.colors.foregroundMuted} />

          <TextInput
            style={[styles.searchInput, { color: theme.colors.foreground }]}
            placeholder="Buscar ciudad, país o tarea..."
            placeholderTextColor={theme.colors.foregroundMuted}
            value={searchQuery}
            onChangeText={setQuery => {
              setSearchQuery(setQuery);
              if (selectedTask) setSelectedTask(null);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />

          {searchQuery.length > 0 ? (
            <Pressable
              hitSlop={10}
              onPress={() => setSearchQuery('')}
              style={styles.clearBtn}
            >
              <X size={16} color={theme.colors.foregroundMuted} />
            </Pressable>
          ) : (
            <View style={styles.taskCountPill}>
              <Text style={[styles.taskCountText, { color: gold[500] }]}>
                {tasks.length}
              </Text>
            </View>
          )}
        </View>

        {/* Carrusel de chips de filtro */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterScrollWrapper}
          pointerEvents="auto"
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setActiveFilter(opt.id);
                  if (selectedTask) setSelectedTask(null);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? gold[400]
                      : theme.colors.surface,
                    borderColor: isActive
                      ? gold[400]
                      : theme.colors.border,
                  },
                ]}
              >
                <Text style={styles.filterEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.filterLabel,
                    {
                      color: isActive
                        ? '#000000'
                        : theme.colors.foreground,
                      fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_500Medium',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Indicador de carga */}
      {isLoading ? (
        <View style={styles.loadingToast}>
          <ActivityIndicator size="small" color={gold[400]} />
          <Text style={styles.loadingText}>Cargando ubicaciones...</Text>
        </View>
      ) : null}

      {/* Si no hay resultados de búsqueda o tareas */}
      {tasks.length === 0 && !isLoading ? (
        <View
          style={[
            styles.emptyToast,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Compass size={18} color={gold[400]} />
          <Text style={[styles.emptyToastText, { color: theme.colors.foreground }]}>
            {searchQuery.trim()
              ? 'No se encontraron tareas con esa búsqueda'
              : 'Aún no hay tareas con ubicación en esta vista'}
          </Text>
        </View>
      ) : null}

      {/* Controles flotantes: Satélite/Calles, Centrar, Zoom +, Zoom - */}
      <View style={styles.floatingControls} pointerEvents="box-none">
        {/* Menú flotante de capas de Google Maps */}
        {showLayerMenu && (
          <View
            style={[
              styles.layerMenuCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.layerMenuTitle, { color: theme.colors.foregroundMuted }]}>
              TIPO DE MAPA
            </Text>
            {LAYER_MODES.map((mode) => {
              const isSelected = mapType === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  style={[
                    styles.layerOptionRow,
                    isSelected && {
                      backgroundColor: theme.dark
                        ? 'rgba(212, 175, 55, 0.15)'
                        : 'rgba(212, 175, 55, 0.12)',
                    },
                  ]}
                  onPress={() => selectMapType(mode.id)}
                >
                  <Text style={styles.layerOptionEmoji}>{mode.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.layerOptionLabel,
                        {
                          color: isSelected ? gold[400] : theme.colors.foreground,
                          fontFamily: isSelected ? 'Inter_600SemiBold' : 'Inter_500Medium',
                        },
                      ]}
                    >
                      {mode.label}
                    </Text>
                    <Text
                      style={[styles.layerOptionDesc, { color: theme.colors.foregroundMuted }]}
                    >
                      {mode.desc}
                    </Text>
                  </View>
                  {isSelected && (
                    <Text style={{ color: gold[400], fontSize: 13, fontWeight: '700' }}>✓</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={[
            styles.floatingControlBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            showLayerMenu && { borderColor: gold[400] },
          ]}
          onPress={() => setShowLayerMenu((prev) => !prev)}
          accessibilityLabel="Cambiar tipo de mapa (Plano, Satélite, Relieve)"
        >
          <Layers
            size={20}
            color={showLayerMenu || mapType !== 'streets' ? gold[400] : theme.colors.foreground}
          />
        </Pressable>

        <Pressable
          style={[
            styles.floatingControlBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => {
            if (selectedTask) {
              mapRef.current?.centerOn(selectedTask.location_lat, selectedTask.location_lng, 13);
            } else if (tasks.length > 0 && tasks[0]) {
              mapRef.current?.centerOn(tasks[0].location_lat, tasks[0].location_lng, 11);
            } else {
              mapRef.current?.resetView();
            }
          }}
          accessibilityLabel="Centrar tareas"
        >
          <LocateFixed size={20} color={theme.colors.foreground} />
        </Pressable>

        <Pressable
          style={[
            styles.floatingControlBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => mapRef.current?.zoomIn()}
          accessibilityLabel="Acercar mapa"
        >
          <Plus size={22} color={theme.colors.foreground} />
        </Pressable>

        <Pressable
          style={[
            styles.floatingControlBtn,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => mapRef.current?.zoomOut()}
          accessibilityLabel="Alejar mapa"
        >
          <Minus size={22} color={theme.colors.foreground} />
        </Pressable>
      </View>

      {/* Tarjeta inferior con vista previa de la tarea seleccionada */}
      <TaskMapPreviewCard
        task={selectedTask}
        tasksAtLocation={selectedLocationTasks}
        onSelectTask={(nextTask) => {
          setSelectedTask(nextTask);
        }}
        onClose={() => {
          setSelectedTask(null);
          setSelectedLocationTasks([]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 220,
    gap: 10,
    zIndex: 90,
  },
  layerMenuCard: {
    position: 'absolute',
    right: 54,
    top: -10,
    width: 215,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 4,
  },
  layerMenuTitle: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  layerOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  layerOptionEmoji: {
    fontSize: 18,
  },
  layerOptionLabel: {
    fontSize: 13,
  },
  layerOptionDesc: {
    fontSize: 10.5,
    marginTop: 1,
  },
  floatingControlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14.5,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 6,
  },
  taskCountPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
  },
  taskCountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  filterScrollWrapper: {
    marginTop: 10,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    paddingRight: 20,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterEmoji: {
    fontSize: 13,
  },
  filterLabel: {
    fontSize: 12.5,
  },
  loadingToast: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    zIndex: 90,
  },
  loadingText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  emptyToast: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyToastText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
