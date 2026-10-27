import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCcw, RotateCw } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';

/**
 * Editor de foto: recortar (libre o con proporción) y girar 90°.
 * Se usa al añadir fotos a una tarea. Devuelve la uri de la imagen editada,
 * o la original si no se tocó nada.
 */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAGE_W = SCREEN_W - 32;
const STAGE_H = Math.min(SCREEN_H * 0.6, 520);
const MIN_SIZE = 56;
const HANDLE = 28;

type Rect = { x: number; y: number; w: number; h: number };
type Corner = 'tl' | 'tr' | 'bl' | 'br';

const RATIOS: { key: string; label: string; value: number | null }[] = [
  { key: 'free', label: 'Libre', value: null },
  { key: '1:1', label: '1:1', value: 1 },
  { key: '4:5', label: '4:5', value: 4 / 5 },
  { key: '3:4', label: '3:4', value: 3 / 4 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
];

type Props = {
  visible: boolean;
  uri: string | null;
  width: number;
  height: number;
  index: number;
  total: number;
  onCancel: () => void;
  onDone: (uri: string) => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Mayor rectángulo con la proporción dada que cabe en la imagen mostrada, centrado. */
function fitRatio(dw: number, dh: number, ratio: number): Rect {
  let w = dw;
  let h = w / ratio;
  if (h > dh) {
    h = dh;
    w = h * ratio;
  }
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

export function PhotoCropModal({ visible, uri, width, height, index, total, onCancel, onDone }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ratioKey, setRatioKey] = useState('free');
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 });
  const [edited, setEdited] = useState(false);

  // Tamaño con el que se muestra la imagen dentro del escenario.
  const display = useMemo(() => {
    if (!current || !current.width || !current.height) return { w: STAGE_W, h: STAGE_H };
    const scale = Math.min(STAGE_W / current.width, STAGE_H / current.height);
    return { w: current.width * scale, h: current.height * scale };
  }, [current]);

  const ratio = RATIOS.find((r) => r.key === ratioKey)?.value ?? null;

  // Siempre con los últimos valores para los gestos (PanResponder se crea una sola vez).
  const latest = useRef({ rect, display, ratio });
  latest.current = { rect, display, ratio };
  const startRect = useRef<Rect>(rect);

  // Cada vez que se abre con una foto nueva: reinicia el editor.
  useEffect(() => {
    if (!visible || !uri) return;
    setCurrent({ uri, width, height });
    setRatioKey('free');
    setEdited(false);
    setBusy(false);
  }, [visible, uri, width, height]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  // Al cambiar la imagen (o girarla) el recorte vuelve a ocupar toda la imagen.
  useEffect(() => {
    if (!current) return;
    const r = latest.current.ratio;
    setRect(r ? fitRatio(display.w, display.h, r) : { x: 0, y: 0, w: display.w, h: display.h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, display.w, display.h]);

  const selectRatio = (key: string) => {
    setRatioKey(key);
    const value = RATIOS.find((r) => r.key === key)?.value ?? null;
    if (value) setRect(fitRatio(display.w, display.h, value));
  };

  const rotate = async (degrees: 90 | -90) => {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await ImageManipulator.manipulateAsync(
        current.uri,
        [{ rotate: degrees }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      setCurrent({ uri: res.uri, width: res.width, height: res.height });
      setEdited(true);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!current || busy) return;
    const r = latest.current.rect;
    const d = latest.current.display;
    const fullImage = r.w >= d.w - 2 && r.h >= d.h - 2;
    if (fullImage) {
      onDone(current.uri); // sin recorte: solo, quizá, girada
      return;
    }
    setBusy(true);
    try {
      const k = current.width / d.w;
      const originX = clamp(Math.round(r.x * k), 0, current.width - 1);
      const originY = clamp(Math.round(r.y * k), 0, current.height - 1);
      const cw = clamp(Math.round(r.w * k), 1, current.width - originX);
      const ch = clamp(Math.round(r.h * k), 1, current.height - originY);
      const res = await ImageManipulator.manipulateAsync(
        current.uri,
        [{ crop: { originX, originY, width: cw, height: ch } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      onDone(res.uri);
    } finally {
      setBusy(false);
    }
  };

  // ── Gestos ────────────────────────────────────────────────────────────
  const bodyPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startRect.current = latest.current.rect;
      },
      onPanResponderMove: (_, g) => {
        const { display: d } = latest.current;
        const s = startRect.current;
        setRect({
          ...s,
          x: clamp(s.x + g.dx, 0, d.w - s.w),
          y: clamp(s.y + g.dy, 0, d.h - s.h),
        });
        setEdited(true);
      },
    }),
  ).current;

  const makeCornerPan = (corner: Corner) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        startRect.current = latest.current.rect;
      },
      onPanResponderMove: (_, g) => {
        const { display: d, ratio: lock } = latest.current;
        const s = startRect.current;
        const right = corner === 'tr' || corner === 'br';
        const bottom = corner === 'bl' || corner === 'br';
        // Esquina opuesta: queda fija.
        const fx = right ? s.x : s.x + s.w;
        const fy = bottom ? s.y : s.y + s.h;
        // Esquina que se arrastra.
        const nx = (right ? s.x + s.w : s.x) + g.dx;
        const ny = (bottom ? s.y + s.h : s.y) + g.dy;
        const availW = right ? d.w - fx : fx;
        const availH = bottom ? d.h - fy : fy;

        let w: number;
        let h: number;
        if (lock) {
          const maxW = Math.min(availW, availH * lock);
          w = clamp(Math.abs(nx - fx), Math.min(MIN_SIZE, maxW), maxW);
          h = w / lock;
        } else {
          w = clamp(Math.abs(nx - fx), Math.min(MIN_SIZE, availW), availW);
          h = clamp(Math.abs(ny - fy), Math.min(MIN_SIZE, availH), availH);
        }
        setRect({ x: right ? fx : fx - w, y: bottom ? fy : fy - h, w, h });
        setEdited(true);
      },
    });

  const cornerPans = useRef({
    tl: makeCornerPan('tl'),
    tr: makeCornerPan('tr'),
    bl: makeCornerPan('bl'),
    br: makeCornerPan('br'),
  }).current;

  const thirds = [1, 2].map((i) => i / 3);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={10} disabled={busy}>
            <Text style={styles.headerCancel}>{t('common.cancel')}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{total > 1 ? t('photo_crop.photo_count', { current: index + 1, total }) : t('photo_crop.edit_photo')}</Text>
          <Pressable onPress={() => void apply()} hitSlop={10} disabled={busy}>
            <Text style={[styles.headerDone, busy && { opacity: 0.4 }]}>
              {index + 1 < total ? t('photo_crop.next') : t('photo_crop.done')}
            </Text>
          </Pressable>
        </View>

        {/* Escenario */}
        <View style={styles.stage}>
          {current && (
            <View style={{ width: display.w, height: display.h }}>
              <Image
                source={{ uri: current.uri }}
                style={{ width: display.w, height: display.h }}
                resizeMode="stretch"
              />

              {/* Oscurece lo que queda fuera del recorte */}
              <View pointerEvents="none" style={[styles.shade, { top: 0, left: 0, right: 0, height: rect.y }]} />
              <View
                pointerEvents="none"
                style={[styles.shade, { top: rect.y + rect.h, left: 0, right: 0, bottom: 0 }]}
              />
              <View
                pointerEvents="none"
                style={[styles.shade, { top: rect.y, left: 0, width: rect.x, height: rect.h }]}
              />
              <View
                pointerEvents="none"
                style={[styles.shade, { top: rect.y, left: rect.x + rect.w, right: 0, height: rect.h }]}
              />

              {/* Marco de recorte */}
              <View
                {...bodyPan.panHandlers}
                style={[styles.frame, { left: rect.x, top: rect.y, width: rect.w, height: rect.h }]}
              >
                {thirds.map((t) => (
                  <View
                    key={`v${t}`}
                    pointerEvents="none"
                    style={[styles.gridLine, { left: `${t * 100}%`, top: 0, bottom: 0, width: StyleSheet.hairlineWidth }]}
                  />
                ))}
                {thirds.map((t) => (
                  <View
                    key={`h${t}`}
                    pointerEvents="none"
                    style={[styles.gridLine, { top: `${t * 100}%`, left: 0, right: 0, height: StyleSheet.hairlineWidth }]}
                  />
                ))}
              </View>

              {/* Esquinas */}
              {(['tl', 'tr', 'bl', 'br'] as Corner[]).map((c) => {
                const left = c === 'tl' || c === 'bl' ? rect.x : rect.x + rect.w;
                const top = c === 'tl' || c === 'tr' ? rect.y : rect.y + rect.h;
                return (
                  <View
                    key={c}
                    {...cornerPans[c].panHandlers}
                    style={[styles.handleHit, { left: left - HANDLE / 2, top: top - HANDLE / 2 }]}
                  >
                    <View
                      style={[
                        styles.handleDot,
                        c === 'tl' && styles.cornerTL,
                        c === 'tr' && styles.cornerTR,
                        c === 'bl' && styles.cornerBL,
                        c === 'br' && styles.cornerBR,
                      ]}
                    />
                  </View>
                );
              })}
            </View>
          )}
          {busy && (
            <View style={styles.busy} pointerEvents="none">
              <ActivityIndicator color={gold[400]} />
            </View>
          )}
        </View>

        {/* Herramientas */}
        <View style={styles.tools}>
          <View style={styles.rotateRow}>
            <Pressable style={styles.rotateBtn} onPress={() => void rotate(-90)} disabled={busy}>
              <RotateCcw color="#fff" size={20} strokeWidth={2} />
              <Text style={styles.rotateText}>{t('photo_crop.rotate')}</Text>
            </Pressable>
            <Pressable style={styles.rotateBtn} onPress={() => void rotate(90)} disabled={busy}>
              <RotateCw color="#fff" size={20} strokeWidth={2} />
              <Text style={styles.rotateText}>{t('photo_crop.rotate')}</Text>
            </Pressable>
          </View>

          <View style={styles.ratioRow}>
            {RATIOS.map((r) => {
              const active = r.key === ratioKey;
              const label = r.key === 'free' ? t('photo_crop.ratio_free') : r.label;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => selectRatio(r.key)}
                  style={[styles.ratioChip, active && styles.ratioChipActive]}
                >
                  <Text style={[styles.ratioText, active && { color: '#000' }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {edited && (
            <Pressable
              onPress={() => {
                setCurrent({ uri: uri!, width, height });
                setRatioKey('free');
                setEdited(false);
              }}
              disabled={busy}
              hitSlop={8}
            >
              <Text style={styles.reset}>{t('photo_crop.reset')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerCancel: { color: 'rgba(255,255,255,0.75)', fontSize: 16 },
  headerDone: { color: gold[400], fontSize: 16, fontWeight: '700' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shade: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  gridLine: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  handleHit: {
    position: 'absolute',
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleDot: { width: 18, height: 18, borderColor: gold[400] },
  cornerTL: { borderTopWidth: 4, borderLeftWidth: 4, marginLeft: -6, marginTop: -6 },
  cornerTR: { borderTopWidth: 4, borderRightWidth: 4, marginRight: -6, marginTop: -6 },
  cornerBL: { borderBottomWidth: 4, borderLeftWidth: 4, marginLeft: -6, marginBottom: -6 },
  cornerBR: { borderBottomWidth: 4, borderRightWidth: 4, marginRight: -6, marginBottom: -6 },
  busy: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tools: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: 16,
    alignItems: 'center',
  },
  rotateRow: { flexDirection: 'row', gap: 12 },
  rotateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rotateText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  ratioRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  ratioChip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratioChipActive: { backgroundColor: gold[400], borderColor: gold[400] },
  ratioText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reset: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
});
