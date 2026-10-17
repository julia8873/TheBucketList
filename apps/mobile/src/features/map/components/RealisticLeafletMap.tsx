import React, { useRef, useImperativeHandle, forwardRef, useEffect, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, gold } from '@bucketlist/ui';
import { storageApi } from '../../../services/api/storage';
import { resolveTaskImage } from '../../../utils/taskImage';
import type { MapTaskItem } from '../types';
import { LEAFLET_CSS, LEAFLET_JS } from '../assets/leafletBundle';

export type MapLayerMode = 'streets' | 'satellite' | 'terrain';

export interface RealisticMapRef {
  zoomIn: () => void;
  zoomOut: () => void;
  centerOn: (lat: number, lng: number, zoom?: number) => void;
  flyToLocation: (lat: number, lng: number, zoom?: number) => void;
  fitCoordinates: (coords: { lat: number; lng: number }[]) => void;
  resetView: () => void;
  setMapType: (type: MapLayerMode) => void;
}

interface RealisticLeafletMapProps {
  tasks: MapTaskItem[];
  selectedTask: MapTaskItem | null;
  onSelectTask: (task: MapTaskItem, locationGroup?: MapTaskItem[]) => void;
  mapType?: MapLayerMode;
  isSearching?: boolean;
}

export const RealisticLeafletMap = forwardRef<RealisticMapRef, RealisticLeafletMapProps>(
  ({ tasks, selectedTask, onSelectTask, mapType = 'streets', isSearching = false }, ref) => {
    const { theme } = useTheme();
    const webViewRef = useRef<WebView | null>(null);

    // Métodos expuestos al padre para controlar el mapa
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) { window.map.zoomIn({ animate: true }); }
          true;
        `);
      },
      zoomOut: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) { window.map.zoomOut({ animate: true }); }
          true;
        `);
      },
      centerOn: (lat: number, lng: number, zoom?: number) => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) {
            window.map.stop();
            ${
              zoom !== undefined
                ? `var currentZ = window.map.getZoom();
                   var targetZ = Math.max(currentZ, ${zoom});
                   window.map.flyTo([${lat}, ${lng}], targetZ, { animate: true, duration: 1.2, easeLinearity: 0.25 });`
                : `window.map.panTo([${lat}, ${lng}], { animate: true, duration: 0.6, easeLinearity: 0.25 });`
            }
          }
          true;
        `);
      },
      flyToLocation: (lat: number, lng: number, zoom = 14) => {
        webViewRef.current?.injectJavaScript(`
          if (window.flyTo) {
            window.flyTo(${lat}, ${lng}, ${zoom});
          } else if (window.map) {
            window.map.stop();
            window.map.flyTo([${lat}, ${lng}], ${zoom}, {
              animate: true,
              duration: 1.2,
              easeLinearity: 0.25
            });
          }
          true;
        `);
      },
      fitCoordinates: (coords: { lat: number; lng: number }[]) => {
        const json = JSON.stringify(coords);
        webViewRef.current?.injectJavaScript(`
          if (window.fitCoords) {
            window.fitCoords(${json});
          } else if (window.map) {
            var raw = ${json};
            if (raw && raw.length > 0) {
              window.map.stop();
              var bounds = L.latLngBounds(raw.map(function(c) { return [c.lat, c.lng]; }));
              window.map.fitBounds(bounds, {
                maxZoom: 14,
                padding: [50, 50],
                animate: true,
                duration: 1.2
              });
            }
          }
          true;
        `);
      },
      resetView: () => {
        webViewRef.current?.injectJavaScript(`
          if (window.map) {
            window.map.stop();
            window.map.flyTo([25.0, 0.0], 2.5, { animate: true, duration: 1.4, easeLinearity: 0.25 });
          }
          true;
        `);
      },
      setMapType: (type: MapLayerMode) => {
        webViewRef.current?.injectJavaScript(`
          if (window.setTileLayer) { window.setTileLayer('${type}'); }
          true;
        `);
      },
    }));

    function formatMapTask(t: MapTaskItem) {
      if (!t) return null;
      const lat = typeof t.location_lat === 'number' && !isNaN(t.location_lat)
        ? t.location_lat
        : parseFloat(String(t.location_lat));
      const lng = typeof t.location_lng === 'number' && !isNaN(t.location_lng)
        ? t.location_lng
        : parseFloat(String(t.location_lng));

      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        return null;
      }

      const imageVal = resolveTaskImage(t, { preferThumb: true });
      let coverUrl: string | null = null;
      if (imageVal && !imageVal.startsWith('preset:')) {
        coverUrl = (imageVal.startsWith('http') || imageVal.startsWith('file:') || imageVal.startsWith('content:'))
          ? imageVal
          : storageApi.getPublicUrl(imageVal);
      }

      return {
        id: t.id,
        title: t.title || 'Tarea',
        lat,
        lng,
        location: (t.location_text || '').split(',')[0] || 'Ubicación',
        status: t.status,
        cover: coverUrl,
        avatar: t.user?.avatar_url || null,
        author: t.user?.display_name || t.user?.username || 'Usuario',
      };
    }

    const isMapLoadedRef = useRef(false);
    const latestTasksRef = useRef(tasks);
    latestTasksRef.current = tasks;
    const latestSelectedIdRef = useRef(selectedTask?.id);
    latestSelectedIdRef.current = selectedTask?.id;

    const syncTasksToMap = useCallback(
      (taskList: MapTaskItem[], selId?: string | null, autoFit = false) => {
        const validTasks = taskList.map(formatMapTask).filter(Boolean);
        const payload = JSON.stringify(validTasks);
        webViewRef.current?.injectJavaScript(`
          try {
            if (window.updateTasks) {
              window.updateTasks(${payload}, '${selId || ''}', ${autoFit});
            } else {
              window.__INITIAL_TASKS__ = ${payload};
              window.__INITIAL_SELECTED_ID__ = '${selId || ''}';
            }
          } catch (e) {
            console.warn("updateTasks error:", e);
          }
          true;
        `);
      },
      []
    );

    // Sincronizar tareas cuando cambian los datos, filtros o búsqueda
    useEffect(() => {
      syncTasksToMap(tasks, selectedTask?.id, isSearching);
    }, [tasks, selectedTask?.id, isSearching, syncTasksToMap]);

    // Sincronizar selección de tarea activa
    useEffect(() => {
      if (isMapLoadedRef.current && selectedTask) {
        webViewRef.current?.injectJavaScript(`
          try {
            if (window.selectTask) {
              window.selectTask('${selectedTask.id}', ${selectedTask.location_lat}, ${selectedTask.location_lng});
            }
          } catch (e) {}
          true;
        `);
      }
    }, [selectedTask]);

    // Sincronizar capa satélite o calles
    useEffect(() => {
      if (isMapLoadedRef.current) {
        webViewRef.current?.injectJavaScript(`
          try {
            if (window.setTileLayer) {
              window.setTileLayer('${mapType}');
            }
          } catch (e) {}
          true;
        `);
      }
    }, [mapType]);

    // Mensajes recibidos desde el WebView (cuando el usuario toca un marcador o el mapa está listo)
    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MAP_READY') {
          isMapLoadedRef.current = true;
          setIsMapLoaded(true);
          syncTasksToMap(latestTasksRef.current, latestSelectedIdRef.current, false);
        } else if (data.type === 'MAP_ERROR') {
          console.warn('[Leaflet Web Error]', data.message);
        } else if (data.type === 'SELECT_TASK' || data.type === 'SELECT_TASK_GROUP') {
          const taskIds: string[] = data.taskIds || (data.taskId ? [data.taskId] : []);
          const groupTasks = tasks.filter((t) => taskIds.includes(t.id));
          const primary = tasks.find((t) => t.id === data.taskId) || groupTasks[0];
          if (primary) {
            onSelectTask(primary, groupTasks.length > 0 ? groupTasks : [primary]);
          }
        }
      } catch (err) {
        console.warn('Error parsing map message:', err);
      }
    };

    const [isMapLoaded, setIsMapLoaded] = useState(false);

    // Plantilla HTML con Leaflet y mapas reales (100% estática e independiente de tasks para evitar recargas)
    const htmlContent = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    ${LEAFLET_CSS}
  </style>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: ${theme.dark ? '#1F2937' : '#AAD3DF'};
      -webkit-tap-highlight-color: transparent;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background: ${theme.dark ? '#1F2937' : '#AAD3DF'};
    }
    .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      background: ${theme.dark ? '#1F2937' : '#AAD3DF'} !important;
    }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }

    /* Marcador Modo Punto */
    .point-marker {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #D4B13A;
      border: 2.5px solid ${theme.dark ? '#000000' : '#FFFFFF'};
      box-shadow: 0 2px 6px rgba(0,0,0,0.45);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    .point-marker.completed {
      background: #34C759;
    }
    .point-marker.selected {
      transform: scale(1.35);
      border-color: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(212, 177, 58, 0.45);
    }
    .point-marker.completed.selected {
      box-shadow: 0 0 0 4px rgba(52, 199, 89, 0.45);
    }
    .point-core {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: #FFFFFF;
    }
    .point-badge {
      position: absolute;
      top: -7px;
      right: -8px;
      background: #D4B13A;
      color: #000000;
      font-size: 9px;
      font-weight: 800;
      border-radius: 7px;
      padding: 1px 4px;
      line-height: 1;
      border: 1px solid ${theme.dark ? '#1A1E24' : '#FFFFFF'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    /* Marcador Modo Tarjeta (Expandido al hacer zoom) */
    .card-marker-container {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      transform-origin: 50% 100%;
      transition: transform 0.2s ease;
      width: max-content;
      max-width: 185px;
    }
    .card-marker-container:hover, .card-marker-container.selected {
      transform: translate(-50%, -100%) scale(1.05);
      z-index: 9999 !important;
    }
    .card-marker {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px 4px 4px;
      background: ${theme.dark ? '#1A1E24' : '#FFFFFF'};
      border: 1.5px solid ${theme.dark ? '#2E3540' : '#D0D5DD'};
      border-radius: 12px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      max-width: 185px;
      box-sizing: border-box;
    }
    .card-marker.selected {
      border-color: #D4B13A;
      box-shadow: 0 4px 14px rgba(212, 177, 58, 0.4);
    }
    .card-marker.completed {
      border-color: rgba(52, 199, 89, 0.5);
    }
    .card-thumb-wrapper {
      position: relative;
      width: 26px;
      height: 26px;
      flex-shrink: 0;
    }
    .card-thumb {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      object-fit: cover;
      background: #2A2F38;
      display: block;
    }
    .card-thumb-fallback {
      width: 26px;
      height: 26px;
      border-radius: 7px;
      background: rgba(212, 177, 58, 0.15);
      color: #D4B13A;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      flex-shrink: 0;
    }
    .card-thumb-check {
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      border-radius: 6px;
      background: #34C759;
      color: #FFFFFF;
      font-size: 8px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid ${theme.dark ? '#1A1E24' : '#FFFFFF'};
    }
    .card-info {
      display: flex;
      flex-direction: column;
      text-align: left;
      min-width: 0;
      overflow: hidden;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 600;
      color: ${theme.dark ? '#FFFFFF' : '#101828'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.25;
      word-break: break-word;
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-count-badge {
      background: #D4B13A;
      color: #000000;
      font-size: 9px;
      font-weight: 700;
      padding: 0.5px 5px;
      border-radius: 6px;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
    }
    .card-stack-shadow {
      position: absolute;
      top: -3px;
      left: 3px;
      right: -3px;
      height: 100%;
      background: ${theme.dark ? '#14181F' : '#E4E7EC'};
      border: 1.5px solid ${theme.dark ? '#2E3540' : '#D0D5DD'};
      border-radius: 12px;
      z-index: -1;
      opacity: 0.75;
    }
    .card-sub {
      font-size: 9px;
      color: ${theme.dark ? '#98A2B3' : '#667085'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.15;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-arrow {
      width: 0;
      height: 0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid ${theme.dark ? '#1A1E24' : '#FFFFFF'};
      margin-top: -1px;
    }
    .card-marker.selected + .card-arrow {
      border-top-color: #D4B13A;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    ${LEAFLET_JS}
  </script>
  <script>
    window.onerror = function(msg, url, line) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'MAP_ERROR',
          message: msg + ' at ' + line
        }));
      }
    };

    var map = null;
    var currentTasks = [];
    var currentMarkers = [];
    var selectedTaskId = '';
    var ZOOM_THRESHOLD = 11;
    var currentLayer = null;
    var cartoRoadmap = null;
    var esriSatellite = null;
    var esriTerrain = null;

    function bootLeaflet() {
      if (typeof L === 'undefined') {
        setTimeout(bootLeaflet, 30);
        return;
      }

      // 1. Inicializar mapa Leaflet centrado globalmente con Google Maps
      map = L.map('map', {
        center: [28.0, 0.0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 20,
        zoomControl: false,
        attributionControl: false,
        zoomAnimation: true,
        fadeAnimation: true,
        markerZoomAnimation: true,
        zoomAnimationThreshold: 8,
        inertia: true,
        inertiaDeceleration: 2500,
        wheelPxPerZoomLevel: 120,
      });
      window.map = map;

      // 2. Capas cartográficas de ultra-alta fidelidad con fallback automático
      function createSafeTileLayer(url, fallbackUrl) {
        var layer = L.tileLayer(url, {
          maxZoom: 20,
          attribution: ''
        });
        layer.on('tileerror', function(error) {
          if (fallbackUrl && error.tile && !error.tile._fallbackTried) {
            error.tile._fallbackTried = true;
            var c = error.coords;
            error.tile.src = fallbackUrl
              .replace('{z}', c.z)
              .replace('{x}', c.x)
              .replace('{y}', c.y);
          }
        });
        return layer;
      }

      cartoRoadmap = createSafeTileLayer(
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      );

      esriSatellite = createSafeTileLayer(
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      );

      esriTerrain = createSafeTileLayer(
        'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
      );

      // Iniciar con Roadmap como capa principal
      currentLayer = cartoRoadmap;
      currentLayer.addTo(map);

      window.setTileLayer = function(type) {
        if (!map) return;
        if (currentLayer) {
          map.removeLayer(currentLayer);
        }

        if (type === 'satellite') {
          currentLayer = esriSatellite;
        } else if (type === 'terrain') {
          currentLayer = esriTerrain;
        } else {
          currentLayer = cartoRoadmap;
        }
        currentLayer.addTo(map);
      };

      // Al cambiar el nivel de zoom, conmutar entre puntos y tarjetas
      map.on('zoomend', function() {
        renderMarkers();
      });

      // Notificar a React Native cuando el mapa esté listo y forzar render de tamaño
      map.whenReady(function() {
        map.invalidateSize();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
        }
      });

      // Timers defensivos para asegurar que Leaflet tome el tamaño real del WebView
      setTimeout(function() { if (map) map.invalidateSize(); }, 60);
      setTimeout(function() { if (map) map.invalidateSize(); }, 250);
      setTimeout(function() { if (map) map.invalidateSize(); }, 700);
      window.addEventListener('resize', function() { if (map) map.invalidateSize(); });

      if (window.__INITIAL_TASKS__ && window.__INITIAL_TASKS__.length > 0) {
        currentTasks = window.__INITIAL_TASKS__;
        selectedTaskId = window.__INITIAL_SELECTED_ID__ || '';
      }
      renderMarkers();
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderMarkers() {
      if (!map) return;
      // Limpiar marcadores anteriores
      currentMarkers.forEach(function(m) { map.removeLayer(m); });
      currentMarkers = [];

      var isZoomedIn = map.getZoom() >= ZOOM_THRESHOLD;

      // Agrupar tareas por ubicación exacta o muy cercana (redondeado a 4 decimales ~11m)
      var locationGroups = [];
      var groupMap = {};

      currentTasks.forEach(function(t) {
        var key = Number(t.lat).toFixed(4) + '_' + Number(t.lng).toFixed(4);
        if (!groupMap[key]) {
          var g = {
            key: key,
            lat: t.lat,
            lng: t.lng,
            tasks: []
          };
          groupMap[key] = g;
          locationGroups.push(g);
        }
        groupMap[key].tasks.push(t);
      });

      locationGroups.forEach(function(group) {
        var tasksInGroup = group.tasks;
        var totalTasks = tasksInGroup.length;

        var selectedIndex = tasksInGroup.findIndex(function(t) { return t.id === selectedTaskId; });
        var isGroupSelected = selectedIndex >= 0;
        var activeTask = isGroupSelected ? tasksInGroup[selectedIndex] : tasksInGroup[0];
        var isCompleted = activeTask.status === 'completed';

        var iconHtml = '';
        var iconSize = [18, 18];
        var iconAnchor = [9, 9];

        // Solo expande a etiqueta si hay zoom suficiente (>= 11) o si una tarea del grupo está seleccionada
        if (!isZoomedIn && !isGroupSelected) {
          // MODO PUNTO (no satura el mapa)
          var pointBadgeHtml = totalTasks > 1 ? '<span class="point-badge">' + totalTasks + '</span>' : '';
          iconHtml = '<div class="point-marker ' + (isCompleted ? 'completed' : '') + ' ' + (isGroupSelected ? 'selected' : '') + '">' +
                       '<div class="point-core"></div>' +
                       pointBadgeHtml +
                     '</div>';
          iconSize = [18, 18];
          iconAnchor = [9, 9];
        } else {
          // MODO ETIQUETA EXPANDIDA (zoom alto de ciudad o tarea seleccionada)
          var thumbHtml = activeTask.cover
            ? '<img src="' + escapeHtml(activeTask.cover) + '" class="card-thumb" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';" />' +
              '<div class="card-thumb-fallback" style="display:none;">📍</div>'
            : '<div class="card-thumb-fallback">📍</div>';

          var checkHtml = isCompleted ? '<div class="card-thumb-check">✓</div>' : '';

          var thumbWrapperHtml = '<div class="card-thumb-wrapper">' +
                                   thumbHtml +
                                   checkHtml +
                                 '</div>';

          var subHtml = (activeTask.location || activeTask.author)
            ? '<div class="card-sub">' + escapeHtml(activeTask.location || activeTask.author || '') + '</div>'
            : '';

          var countBadgeHtml = totalTasks > 1
            ? '<span class="card-count-badge">' + (isGroupSelected ? (selectedIndex + 1) + '/' + totalTasks : '+' + (totalTasks - 1)) + '</span>'
            : '';

          iconHtml = '<div class="card-marker-container ' + (isGroupSelected ? 'selected' : '') + '">' +
                       (totalTasks > 1 ? '<div class="card-stack-shadow"></div>' : '') +
                       '<div class="card-marker ' + (isGroupSelected ? 'selected' : '') + ' ' + (isCompleted ? 'completed' : '') + '">' +
                         thumbWrapperHtml +
                         '<div class="card-info">' +
                           '<div class="card-title-row">' +
                             '<div class="card-title">' + escapeHtml(activeTask.title || 'Tarea') + '</div>' +
                             countBadgeHtml +
                           '</div>' +
                           subHtml +
                         '</div>' +
                       '</div>' +
                       '<div class="card-arrow"></div>' +
                     '</div>';
          iconSize = [0, 0];
          iconAnchor = [0, 0];
        }

        var customIcon = L.divIcon({
          html: iconHtml,
          className: '',
          iconSize: iconSize,
          iconAnchor: iconAnchor,
        });

        var marker = L.marker([group.lat, group.lng], { icon: customIcon });

        marker.on('click', function() {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SELECT_TASK_GROUP',
              taskId: activeTask.id,
              taskIds: tasksInGroup.map(function(t) { return t.id; })
            }));
          }
        });

        marker.addTo(map);
        currentMarkers.push(marker);
      });
    }

    window.flyTo = function(lat, lng, zoom) {
      if (map) {
        map.stop();
        map.flyTo([lat, lng], zoom || 14, { animate: true, duration: 1.2, easeLinearity: 0.25 });
      }
    };

    window.panTo = function(lat, lng) {
      if (map) {
        map.stop();
        map.panTo([lat, lng], { animate: true, duration: 0.6, easeLinearity: 0.25 });
      }
    };

    window.fitCoords = function(coords) {
      if (map && coords && coords.length > 0) {
        map.stop();
        var bounds = L.latLngBounds(coords.map(function(c) { return [c.lat, c.lng]; }));
        map.fitBounds(bounds, { maxZoom: 14, padding: [50, 50], animate: true, duration: 1.2 });
      }
    };

    window.updateTasks = function(tasks, selId, autoFit) {
      currentTasks = tasks || [];
      selectedTaskId = selId || '';
      renderMarkers();
      if (map) map.invalidateSize();
      if (autoFit && currentTasks.length > 0 && map) {
        try {
          map.stop();
          if (currentTasks.length === 1) {
            map.flyTo([currentTasks[0].lat, currentTasks[0].lng], 14, {
              animate: true,
              duration: 1.2,
              easeLinearity: 0.25
            });
          } else {
            var groupBounds = L.latLngBounds(currentTasks.map(function(t) { return [t.lat, t.lng]; }));
            map.fitBounds(groupBounds, {
              maxZoom: 14,
              padding: [50, 50],
              animate: true,
              duration: 1.2
            });
          }
        } catch (e) {}
      }
    };

    window.selectTask = function(taskId, lat, lng) {
      selectedTaskId = taskId;
      renderMarkers();
      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        if (map) {
          map.stop();
          map.panTo([lat, lng], { animate: true, duration: 0.6, easeLinearity: 0.25 });
        }
      }
    };

    // Arrancar Leaflet cuando los scripts estén listos
    bootLeaflet();
  </script>
</body>
</html>
    `, [theme.dark]);

    const webViewSource = useMemo(
      () => ({
        html: htmlContent,
        baseUrl: 'https://www.google.com',
      }),
      [htmlContent]
    );

    return (
      <View style={[styles.container, { backgroundColor: theme.dark ? '#1F2937' : '#AAD3DF' }]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={webViewSource}
          style={[
            styles.webView,
            { backgroundColor: theme.dark ? '#1F2937' : '#AAD3DF' },
            Platform.OS === 'android' ? { opacity: 0.99 } : undefined,
          ]}
          androidLayerType="software"
          onMessage={handleMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[Leaflet WebView Error]:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[Leaflet WebView HttpError]:', nativeEvent.statusCode, nativeEvent.url);
          }}
          onLoadEnd={() => {
            isMapLoadedRef.current = true;
            setIsMapLoaded(true);
            syncTasksToMap(latestTasksRef.current, latestSelectedIdRef.current, false);
            webViewRef.current?.injectJavaScript(`
              if (window.map) {
                window.map.invalidateSize();
                setTimeout(function() { if (window.map) window.map.invalidateSize(); }, 200);
                setTimeout(function() { if (window.map) window.map.invalidateSize(); }, 600);
              }
              true;
            `);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          startInLoadingState={false}
          mixedContentMode="always"
          allowsInlineMediaPlayback={true}
          cacheEnabled={true}
        />
        {!isMapLoaded && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={gold[400]} />
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
});
