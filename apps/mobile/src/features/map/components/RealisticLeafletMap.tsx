import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
} from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme, gold } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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
    const { i18n } = useTranslation();
    const mapLang = i18n.language?.startsWith('en') ? 'en' : 'es';
    const webViewRef = useRef<WebView | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const isMapLoadedRef = useRef(false);

    const latestTasksRef = useRef(tasks);
    latestTasksRef.current = tasks;
    const latestSelectedIdRef = useRef(selectedTask?.id);
    latestSelectedIdRef.current = selectedTask?.id;

    // Helper para enviar JavaScript o comandos tanto al WebView como al Iframe (Web)
    const execInMap = useCallback((code: string) => {
      if (Platform.OS === 'web') {
        try {
          const win = iframeRef.current?.contentWindow as any;
          if (win && win.eval) {
            win.eval(code);
          } else if (win && win.postMessage) {
            win.postMessage({ type: 'EXEC', code }, '*');
          }
        } catch {
          // Ignore eval restrictions on web
        }
      } else {
        webViewRef.current?.injectJavaScript(`${code}; true;`);
      }
    }, []);

    // Métodos expuestos al componente padre
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        execInMap(`if (window.map) { window.map.zoomIn({ animate: true }); }`);
      },
      zoomOut: () => {
        execInMap(`if (window.map) { window.map.zoomOut({ animate: true }); }`);
      },
      centerOn: (lat: number, lng: number, zoom?: number) => {
        execInMap(`
          if (window.map) {
            window.map.stop();
            ${
              zoom !== undefined
                ? `var curZ = window.map.getZoom();
                   var tarZ = Math.max(curZ, ${zoom});
                   window.map.flyTo([${lat}, ${lng}], tarZ, { animate: true, duration: 1.0, easeLinearity: 0.25 });`
                : `window.map.panTo([${lat}, ${lng}], { animate: true, duration: 0.5, easeLinearity: 0.25 });`
            }
          }
        `);
      },
      flyToLocation: (lat: number, lng: number, zoom = 14) => {
        execInMap(`
          if (window.flyTo) {
            window.flyTo(${lat}, ${lng}, ${zoom});
          } else if (window.map) {
            window.map.stop();
            window.map.flyTo([${lat}, ${lng}], ${zoom}, { animate: true, duration: 1.2 });
          }
        `);
      },
      fitCoordinates: (coords: { lat: number; lng: number }[]) => {
        const json = JSON.stringify(coords);
        execInMap(`
          if (window.fitCoords) {
            window.fitCoords(${json});
          } else if (window.map) {
            var raw = ${json};
            if (raw && raw.length > 0) {
              window.map.stop();
              var bounds = L.latLngBounds(raw.map(function(c) { return [c.lat, c.lng]; }));
              if (bounds.isValid()) {
                window.map.fitBounds(bounds, { maxZoom: 14, padding: [50, 50], animate: true, duration: 1.0 });
              }
            }
          }
        `);
      },
      resetView: () => {
        execInMap(`
          if (window.map) {
            window.map.stop();
            window.map.flyTo([25.0, 0.0], 2.5, { animate: true, duration: 1.2 });
          }
        `);
      },
      setMapType: (type: MapLayerMode) => {
        execInMap(`if (window.setTileLayer) { window.setTileLayer('${type}'); }`);
      },
    }));

    function formatMapTask(t: MapTaskItem) {
      if (!t) return null;
      const lat =
        typeof t.location_lat === 'number' && !isNaN(t.location_lat)
          ? t.location_lat
          : parseFloat(String(t.location_lat));
      const lng =
        typeof t.location_lng === 'number' && !isNaN(t.location_lng)
          ? t.location_lng
          : parseFloat(String(t.location_lng));

      if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
        return null;
      }

      const imageVal = resolveTaskImage(t, { preferThumb: true });
      let coverUrl: string | null = null;
      if (imageVal && !imageVal.startsWith('preset:')) {
        coverUrl =
          imageVal.startsWith('http') ||
          imageVal.startsWith('file:') ||
          imageVal.startsWith('content:')
            ? imageVal
            : storageApi.getPublicUrl(imageVal);
      }

      const rawLoc = (t.location_text || '').trim();
      const parts = rawLoc.split(',').map((p) => p.trim()).filter(Boolean);
      const primaryLoc = parts[0] || 'Ubicación';

      return {
        id: t.id,
        title: t.title || 'Tarea',
        lat,
        lng,
        location: primaryLoc,
        fullLocation: rawLoc,
        status: t.status,
        cover: coverUrl,
        avatar: t.user?.avatar_url || null,
        author: t.user?.display_name || t.user?.username || 'Usuario',
      };
    }

    const syncTasksToMap = useCallback(
      (taskList: MapTaskItem[], selId?: string | null, autoFit = false) => {
        const validTasks = taskList.map(formatMapTask).filter(Boolean);
        const payload = JSON.stringify(validTasks);
        execInMap(`
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
        `);
      },
      [execInMap]
    );

    // Sincronizar tareas al cambiar
    useEffect(() => {
      syncTasksToMap(tasks, selectedTask?.id, isSearching);
    }, [tasks, selectedTask?.id, isSearching, syncTasksToMap]);

    // Sincronizar selección de tarea
    useEffect(() => {
      if (isMapLoadedRef.current && selectedTask) {
        execInMap(`
          try {
            if (window.selectTask) {
              window.selectTask('${selectedTask.id}', ${selectedTask.location_lat}, ${selectedTask.location_lng});
            }
          } catch (e) {}
        `);
      }
    }, [selectedTask, execInMap]);

    // Sincronizar capa
    useEffect(() => {
      if (isMapLoadedRef.current) {
        execInMap(`
          try {
            if (window.setTileLayer) {
              window.setTileLayer('${mapType}');
            }
          } catch (e) {}
        `);
      }
    }, [mapType, execInMap]);

    const handleIncomingMessage = useCallback(
      (data: any) => {
        if (!data || !data.type) return;

        if (data.type === 'MAP_READY') {
          isMapLoadedRef.current = true;
          setIsMapLoaded(true);
          syncTasksToMap(latestTasksRef.current, latestSelectedIdRef.current, false);
          execInMap(`if (window.setTileLayer) { window.setTileLayer('${mapType}'); }`);
        } else if (data.type === 'MAP_ERROR') {
          console.warn('[Leaflet Map Warning]:', data.message);
        } else if (data.type === 'SELECT_TASK' || data.type === 'SELECT_TASK_GROUP') {
          const taskIds: string[] = data.taskIds || (data.taskId ? [data.taskId] : []);
          const groupTasks = latestTasksRef.current.filter((t) => taskIds.includes(t.id));
          const primary = latestTasksRef.current.find((t) => t.id === data.taskId) || groupTasks[0];
          if (primary) {
            onSelectTask(primary, groupTasks.length > 0 ? groupTasks : [primary]);
          }
        }
      },
      [execInMap, mapType, onSelectTask, syncTasksToMap]
    );

    // Listener de mensajes para Web (Iframe)
    useEffect(() => {
      if (Platform.OS !== 'web') return;
      const onWindowMsg = (e: MessageEvent) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          handleIncomingMessage(data);
        } catch {}
      };
      window.addEventListener('message', onWindowMsg);
      return () => window.removeEventListener('message', onWindowMsg);
    }, [handleIncomingMessage]);

    // Listener de mensajes para React Native WebView (Móvil)
    const handleWebViewMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        handleIncomingMessage(data);
      } catch (err) {
        console.warn('Error parsing webview message:', err);
      }
    };

    // Plantilla HTML unificada, hiper-optimizada y a prueba de fallos
    const htmlContent = useMemo(
      () => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
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
      background: ${theme.dark ? '#111827' : '#E5E7EB'};
      -webkit-tap-highlight-color: transparent;
      user-select: none;
      -webkit-user-select: none;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background: ${theme.dark ? '#111827' : '#E5E7EB'};
    }
    .leaflet-container {
      width: 100% !important;
      height: 100% !important;
      background: ${theme.dark ? '#111827' : '#E5E7EB'} !important;
    }
    .leaflet-control-attribution, .leaflet-control-zoom {
      display: none !important;
    }

    /* CLUSTERS GRANDES (Zoom lejano con muchas tareas) */
    .cluster-bubble {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #F5DE7A 0%, #D4AF37 55%, #A17F19 100%);
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 800;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 0 3px rgba(255, 255, 255, 0.95);
      cursor: pointer;
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
      border: 1px solid rgba(0,0,0,0.15);
    }
    .cluster-bubble.all-completed {
      background: radial-gradient(circle at 35% 35%, #6EE7B7 0%, #10B981 60%, #047857 100%);
      color: #FFFFFF;
    }
    .cluster-bubble:active {
      transform: scale(0.92);
    }

    /* MARCADOR DE PUNTO (Zoom lejano para tareas individuales) */
    .point-marker {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #D4AF37;
      border: 2.5px solid ${theme.dark ? '#0F172A' : '#FFFFFF'};
      box-shadow: 0 2px 7px rgba(0,0,0,0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
      position: relative;
    }
    .point-marker.completed {
      background: #10B981;
    }
    .point-marker.selected {
      transform: scale(1.35);
      border-color: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.55);
    }
    .point-core {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #FFFFFF;
    }
    .point-badge {
      position: absolute;
      top: -8px;
      right: -10px;
      background: #D4AF37;
      color: #000000;
      font-size: 9.5px;
      font-weight: 800;
      border-radius: 8px;
      padding: 1px 5px;
      line-height: 1.1;
      border: 1.5px solid ${theme.dark ? '#0F172A' : '#FFFFFF'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }

    /* HUB / TARJETA DETALLADA (Zoom medio y cercano) */
    .hub-container {
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      transform: translate(-50%, -100%);
      transform-origin: 50% 100%;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      width: max-content;
      max-width: 195px;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
    }
    .hub-container:hover, .hub-container.selected {
      transform: translate(-50%, -100%) scale(1.06);
      z-index: 99999 !important;
    }
    .hub-card {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 5px 8px 5px 5px;
      background: ${theme.dark ? '#1A1E24' : '#FFFFFF'};
      border: 1.5px solid ${theme.dark ? '#333A44' : '#E2E8F0'};
      border-radius: 12px;
      max-width: 195px;
      position: relative;
    }
    .hub-card.selected {
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.35);
    }
    .hub-card.completed {
      border-color: rgba(16, 185, 129, 0.6);
    }
    .hub-stack-shadow {
      position: absolute;
      top: -4px;
      left: 4px;
      right: -4px;
      height: 100%;
      background: ${theme.dark ? '#14181F' : '#E2E8F0'};
      border: 1.5px solid ${theme.dark ? '#2E3540' : '#CBD5E1'};
      border-radius: 12px;
      z-index: -1;
    }
    .hub-thumb-wrap {
      position: relative;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    .hub-thumb {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      object-fit: cover;
      background: #2A2F38;
      display: block;
    }
    .hub-thumb-fallback {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(212, 175, 55, 0.15);
      color: #D4AF37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .hub-check {
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 13px;
      height: 13px;
      border-radius: 7px;
      background: #10B981;
      color: #FFFFFF;
      font-size: 8.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid ${theme.dark ? '#1A1E24' : '#FFFFFF'};
    }
    .hub-info {
      display: flex;
      flex-direction: column;
      text-align: left;
      min-width: 0;
      overflow: hidden;
    }
    .hub-title-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .hub-title {
      font-size: 11.5px;
      font-weight: 700;
      color: ${theme.dark ? '#F9FAFB' : '#0F172A'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hub-badge {
      background: #D4AF37;
      color: #000000;
      font-size: 9.5px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 6px;
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
    }
    .hub-sub {
      font-size: 9.5px;
      color: ${theme.dark ? '#9CA3AF' : '#64748B'};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.15;
      margin-top: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .hub-arrow {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${theme.dark ? '#1A1E24' : '#FFFFFF'};
      margin-top: -1px;
    }
    .hub-card.selected + .hub-arrow {
      border-top-color: #D4AF37;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <!-- Primer script para capturar cualquier error antes de Leaflet -->
  <script>
    function postMsg(data) {
      var msg = JSON.stringify(data);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(msg, '*');
      }
    }
    window.onerror = function(msg, url, line) {
      postMsg({ type: 'MAP_ERROR', message: msg + ' (' + line + ')' });
    };
    window.addEventListener('message', function(e) {
      try {
        var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'EXEC' && d.code) {
          eval(d.code);
        }
      } catch (err) {}
    });
  </script>

  <!-- Script CDN de Leaflet con fallback a bundle local -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    if (typeof L === 'undefined') {
      try {
        ${LEAFLET_JS}
      } catch (e) {
        console.warn("Bundle eval fallback error:", e);
      }
    }
    if (typeof L === 'undefined' && typeof window.leaflet !== 'undefined') {
      window.L = window.leaflet;
    }
  </script>

  <!-- Lógica completa del mapa, clusters y anti-solapamiento -->
  <script>
    var map = null;
    var currentTasks = [];
    var currentMarkers = [];
    var selectedTaskId = '';
    var ZOOM_THRESHOLD = 11;
    var currentLayer = null;

    var googleStreets = null;
    var googleSatellite = null;
    var googleTerrain = null;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function onThumbError(img) {
      if (!img) return;
      img.style.display = 'none';
      if (img.nextElementSibling) {
        img.nextElementSibling.style.display = 'flex';
      }
    }

    function createResilientTileLayer(primaryUrl, fallbackUrl, subdomains) {
      var layer = L.tileLayer(primaryUrl, {
        subdomains: subdomains || '0123',
        maxZoom: 20,
        attribution: ''
      });
      if (fallbackUrl) {
        layer.on('tileerror', function(error) {
          if (error.tile && !error.tile._fallbackTried) {
            error.tile._fallbackTried = true;
            var c = error.coords;
            error.tile.src = fallbackUrl
              .replace('{z}', c.z)
              .replace('{x}', c.x)
              .replace('{y}', c.y)
              .replace('{s}', 'a')
              .replace('{r}', '');
          }
        });
      }
      return layer;
    }

    function initMap() {
      if (typeof L === 'undefined') {
        setTimeout(initMap, 40);
        return;
      }

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
        inertia: true,
        preferCanvas: true
      });
      window.map = map;

      // 1. Capas hiper-rápidas de Google Maps con fallback a Carto/OSM
      googleStreets = createResilientTileLayer(
        'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=${mapLang}',
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        '0123'
      );

      googleSatellite = createResilientTileLayer(
        'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=${mapLang}',
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        '0123'
      );

      googleTerrain = createResilientTileLayer(
        'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=${mapLang}',
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        '0123'
      );

      currentLayer = googleStreets;
      currentLayer.addTo(map);

      window.setTileLayer = function(type) {
        if (!map) return;
        if (currentLayer) {
          map.removeLayer(currentLayer);
        }
        if (type === 'satellite') {
          currentLayer = googleSatellite;
        } else if (type === 'terrain') {
          currentLayer = googleTerrain;
        } else {
          currentLayer = googleStreets;
        }
        currentLayer.addTo(map);
      };

      // Debounce para re-renderizado suave en zoom
      var zoomTimer = null;
      map.on('zoomend', function() {
        if (zoomTimer) clearTimeout(zoomTimer);
        zoomTimer = setTimeout(renderMarkers, 60);
      });

      map.whenReady(function() {
        map.invalidateSize();
        postMsg({ type: 'MAP_READY' });
      });

      // Timers de seguridad para asegurar tamaño del contenedor
      setTimeout(function() { if (map) map.invalidateSize(); }, 100);
      setTimeout(function() { if (map) map.invalidateSize(); }, 350);
      setTimeout(function() { if (map) map.invalidateSize(); }, 800);
      window.addEventListener('resize', function() { if (map) map.invalidateSize(); });

      if (window.__INITIAL_TASKS__ && window.__INITIAL_TASKS__.length > 0) {
        currentTasks = window.__INITIAL_TASKS__;
        selectedTaskId = window.__INITIAL_SELECTED_ID__ || '';
      }
      renderMarkers();
    }

    // Algoritmo de Agrupación, Anti-Solapamiento y Rendimiento
    function renderMarkers() {
      if (!map) return;

      currentMarkers.forEach(function(m) { map.removeLayer(m); });
      currentMarkers = [];

      if (!currentTasks || currentTasks.length === 0) return;

      var currentZoom = map.getZoom();
      var isZoomedIn = currentZoom >= ZOOM_THRESHOLD;

      // 1. Agrupar tareas en 'Location Hubs' de forma inteligente por ciudad y radio urbano
      // A nivel calle (zoom >= 16), mostramos puntos separados si distan más de 45m.
      // A nivel ciudad/área (zoom < 16), agrupamos por proximidad urbana (~3.5km) y localidad.
      var hubs = [];
      var MERGE_DISTANCE_METERS = currentZoom >= 16 ? 45 : 3500;

      function getDistanceMeters(lat1, lng1, lat2, lng2) {
        var dLat = (lat2 - lat1) * 111139;
        var dLng = (lng2 - lng1) * 85000;
        return Math.sqrt(dLat * dLat + dLng * dLng);
      }

      function normalizeLoc(str) {
        if (!str) return '';
        return String(str).toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .trim();
      }

      function areLocationsInSameHub(t1, t2) {
        var dist = getDistanceMeters(t1.lat, t1.lng, t2.lat, t2.lng);
        if (dist <= MERGE_DISTANCE_METERS) return true;

        if (currentZoom < 16 && dist <= 7000) {
          var n1 = normalizeLoc(t1.location || t1.fullLocation);
          var n2 = normalizeLoc(t2.location || t2.fullLocation);
          if (n1 && n2) {
            var words1 = n1.split(/\s+/).filter(function(w) { return w.length > 2; });
            var words2 = n2.split(/\s+/).filter(function(w) { return w.length > 2; });
            var common = words1.some(function(w) { return words2.indexOf(w) !== -1; });
            if (common) return true;
          }
        }
        return false;
      }

      currentTasks.forEach(function(t) {
        var targetHub = null;
        for (var i = 0; i < hubs.length; i++) {
          if (areLocationsInSameHub(t, hubs[i])) {
            targetHub = hubs[i];
            break;
          }
        }

        if (targetHub) {
          targetHub.tasks.push(t);
        } else {
          hubs.push({
            lat: t.lat,
            lng: t.lng,
            location: t.location,
            fullLocation: t.fullLocation,
            tasks: [t]
          });
        }
      });

      // 2. Si el zoom es lejano (< 11): agrupar en clusters visuales para evitar solapamiento
      if (!isZoomedIn) {
        var clusters = [];
        var CLUSTER_RADIUS_PX = 46;

        hubs.forEach(function(hub) {
          var pt = map.latLngToContainerPoint([hub.lat, hub.lng]);
          var merged = false;

          for (var i = 0; i < clusters.length; i++) {
            var c = clusters[i];
            var dist = Math.hypot(c.pt.x - pt.x, c.pt.y - pt.y);
            if (dist < CLUSTER_RADIUS_PX) {
              c.hubs.push(hub);
              c.tasks = c.tasks.concat(hub.tasks);
              c.pt.x = (c.pt.x + pt.x) / 2;
              c.pt.y = (c.pt.y + pt.y) / 2;
              merged = true;
              break;
            }
          }

          if (!merged) {
            clusters.push({
              pt: { x: pt.x, y: pt.y },
              center: [hub.lat, hub.lng],
              hubs: [hub],
              tasks: hub.tasks.slice()
            });
          }
        });

        clusters.forEach(function(cluster) {
          var totalInCluster = cluster.tasks.length;
          var hasSelected = cluster.tasks.some(function(t) { return t.id === selectedTaskId; });

          // Si hay más de 1 tarea y ninguna seleccionada: mostrar burbuja de cluster
          if (totalInCluster > 1 && !hasSelected) {
            var isAllDone = cluster.tasks.every(function(t) { return t.status === 'completed'; });
            var diameter = totalInCluster > 50 ? 46 : (totalInCluster > 10 ? 40 : 34);
            var fontSize = diameter > 38 ? 13 : 11.5;

            var clusterHtml = '<div class="cluster-bubble ' + (isAllDone ? 'all-completed' : '') + '" style="width:' + diameter + 'px;height:' + diameter + 'px;font-size:' + fontSize + 'px;">' +
                                totalInCluster +
                              '</div>';

            var clusterIcon = L.divIcon({
              html: clusterHtml,
              className: '',
              iconSize: [diameter, diameter],
              iconAnchor: [diameter / 2, diameter / 2]
            });

            var clusterMarker = L.marker(cluster.center, { icon: clusterIcon });
            clusterMarker.on('click', function() {
              var bounds = L.latLngBounds(cluster.tasks.map(function(t) { return [t.lat, t.lng]; }));
              if (bounds.isValid()) {
                map.flyToBounds(bounds.pad(0.35), { maxZoom: 14, duration: 0.9 });
              } else {
                map.flyTo(cluster.center, currentZoom + 3, { duration: 0.9 });
              }
            });

            clusterMarker.addTo(map);
            currentMarkers.push(clusterMarker);
            return;
          }

          // Si es 1 sola tarea o contiene la seleccionada: mostrar marcadores de todos los hubs del cluster
          cluster.hubs.forEach(function(h) {
            renderSingleHub(h, isZoomedIn);
          });
        });
        return;
      }

      // 3. Si el zoom es de ciudad o cercano (>= 11): renderizar cada Hub con tarjeta o etiqueta
      // Aplicar micro-offset anti-solapamiento si dos hubs están muy cerca en pantalla
      for (var i = 0; i < hubs.length; i++) {
        var h1 = hubs[i];
        var pt1 = map.latLngToContainerPoint([h1.lat, h1.lng]);
        var offsetLat = 0;
        var offsetLng = 0;

        for (var j = 0; j < i; j++) {
          var h2 = hubs[j];
          var pt2 = map.latLngToContainerPoint([h2.lat, h2.lng]);
          if (Math.hypot(pt1.x - pt2.x, pt1.y - pt2.y) < 26) {
            offsetLat += (i % 2 === 0 ? 0.00012 : -0.00012);
            offsetLng += (i % 3 === 0 ? 0.00018 : -0.00018);
          }
        }

        renderSingleHub(h1, true, offsetLat, offsetLng);
      }
    }

    function renderSingleHub(hub, isDetailed, offsetLat, offsetLng) {
      if (!hub) return;
      var tasksInHub = hub.tasks;
      var totalTasks = tasksInHub.length;

      var selIdx = tasksInHub.findIndex(function(t) { return t.id === selectedTaskId; });
      var isHubSelected = selIdx >= 0;
      var activeTask = isHubSelected ? tasksInHub[selIdx] : tasksInHub[0];
      var isCompleted = activeTask.status === 'completed';

      var markerLat = hub.lat + (offsetLat || 0);
      var markerLng = hub.lng + (offsetLng || 0);

      var iconHtml = '';
      var iconSize = [0, 0];
      var iconAnchor = [0, 0];

      if (!isDetailed && !isHubSelected) {
        // MODO PUNTO ELEGANTE
        var badgeHtml = totalTasks > 1 ? '<span class="point-badge">' + totalTasks + '</span>' : '';
        iconHtml = '<div class="point-marker ' + (isCompleted ? 'completed' : '') + ' ' + (isHubSelected ? 'selected' : '') + '">' +
                     '<div class="point-core"></div>' +
                     badgeHtml +
                   '</div>';
        iconSize = [20, 20];
        iconAnchor = [10, 10];
      } else {
        // MODO TARJETA / HUB EXPANDIDO
        var thumbHtml = activeTask.cover
          ? '<img src="' + escapeHtml(activeTask.cover) + '" class="hub-thumb" onerror="onThumbError(this);" />' +
            '<div class="hub-thumb-fallback" style="display:none;">📍</div>'
          : '<div class="hub-thumb-fallback">📍</div>';

        var checkHtml = isCompleted ? '<div class="hub-check">✓</div>' : '';
        var thumbWrapHtml = '<div class="hub-thumb-wrap">' + thumbHtml + checkHtml + '</div>';

        var badgeText = totalTasks > 1
          ? '<span class="hub-badge">' + (isHubSelected ? (selIdx + 1) + '/' + totalTasks : '+' + (totalTasks - 1)) + '</span>'
          : '';

        var subText = (activeTask.location || activeTask.author)
          ? '<div class="hub-sub">' + escapeHtml(activeTask.location || activeTask.author || '') + '</div>'
          : '';

        iconHtml = '<div class="hub-container ' + (isHubSelected ? 'selected' : '') + '">' +
                     (totalTasks > 1 ? '<div class="hub-stack-shadow"></div>' : '') +
                     '<div class="hub-card ' + (isHubSelected ? 'selected' : '') + ' ' + (isCompleted ? 'completed' : '') + '">' +
                       thumbWrapHtml +
                       '<div class="hub-info">' +
                         '<div class="hub-title-row">' +
                           '<div class="hub-title">' + escapeHtml(activeTask.title || '${mapLang === 'en' ? 'Task' : 'Tarea'}') + '</div>' +
                           badgeText +
                         '</div>' +
                         subText +
                       '</div>' +
                     '</div>' +
                     '<div class="hub-arrow"></div>' +
                   '</div>';
        iconSize = [0, 0];
        iconAnchor = [0, 0];
      }

      var customIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: iconSize,
        iconAnchor: iconAnchor
      });

      var marker = L.marker([markerLat, markerLng], { icon: customIcon });

      marker.on('click', function() {
        postMsg({
          type: 'SELECT_TASK_GROUP',
          taskId: activeTask.id,
          taskIds: tasksInHub.map(function(t) { return t.id; })
        });
      });

      marker.addTo(map);
      currentMarkers.push(marker);
    }

    window.flyTo = function(lat, lng, zoom) {
      if (map) {
        map.stop();
        map.flyTo([lat, lng], zoom || 14, { animate: true, duration: 1.1, easeLinearity: 0.25 });
      }
    };

    window.fitCoords = function(coords) {
      if (map && coords && coords.length > 0) {
        map.stop();
        var bounds = L.latLngBounds(coords.map(function(c) { return [c.lat, c.lng]; }));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 14, padding: [50, 50], animate: true, duration: 1.0 });
        }
      }
    };

    window.updateTasks = function(tasks, selId, autoFit) {
      currentTasks = tasks || [];
      selectedTaskId = selId || '';
      renderMarkers();
      if (map) map.invalidateSize();
      var shouldFit = (autoFit || !window.__hasInitiallyCentered) && currentTasks.length > 0;
      if (shouldFit && map) {
        window.__hasInitiallyCentered = true;
        try {
          map.stop();
          if (currentTasks.length === 1) {
            map.flyTo([currentTasks[0].lat, currentTasks[0].lng], 12, { animate: true, duration: 1.0 });
          } else {
            var groupBounds = L.latLngBounds(currentTasks.map(function(t) { return [t.lat, t.lng]; }));
            if (groupBounds.isValid()) {
              map.fitBounds(groupBounds, { maxZoom: 12, padding: [40, 40], animate: true, duration: 1.0 });
            }
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
          map.panTo([lat, lng], { animate: true, duration: 0.5, easeLinearity: 0.25 });
        }
      }
    };

    // Inicializar mapa
    initMap();
  </script>
</body>
</html>
      `,
      [theme.dark, mapLang]
    );

    // En plataforma Web, renderizamos un Iframe directo para compatibilidad al 100%
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.container, { backgroundColor: theme.dark ? '#111827' : '#E5E7EB' }]}>
          <iframe
            ref={iframeRef as any}
            srcDoc={htmlContent}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: theme.dark ? '#111827' : '#E5E7EB',
            }}
            title="Interactive Map"
          />
          {!isMapLoaded && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={gold[400]} />
            </View>
          )}
        </View>
      );
    }

    // En plataforma Móvil (Android e iOS), renderizamos WebView con baseUrl confiable
    return (
      <View style={[styles.container, { backgroundColor: theme.dark ? '#111827' : '#E5E7EB' }]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{
            html: htmlContent,
            baseUrl: 'https://unpkg.com',
          }}
          style={[
            styles.webView,
            { backgroundColor: theme.dark ? '#111827' : '#E5E7EB' },
          ]}
          androidLayerType="hardware"
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[Map WebView Error]:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.warn('[Map WebView HttpError]:', nativeEvent.statusCode, nativeEvent.url);
          }}
          onLoadEnd={() => {
            isMapLoadedRef.current = true;
            setIsMapLoaded(true);
            syncTasksToMap(latestTasksRef.current, latestSelectedIdRef.current, false);
            execInMap(`
              if (window.map) {
                window.map.invalidateSize();
                setTimeout(function() { if (window.map) window.map.invalidateSize(); }, 200);
              }
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

RealisticLeafletMap.displayName = 'RealisticLeafletMap';

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
