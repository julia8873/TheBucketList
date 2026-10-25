import { themedStyleSheet } from '@bucketlist/ui';
import { StyleSheet, Dimensions, Platform } from 'react-native';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const BADGES_OVERLAP = 18;

export { SCREEN_WIDTH, COVER_HEIGHT, BADGES_OVERLAP };

export const styles = themedStyleSheet({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverContainer: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: COVER_HEIGHT,
    zIndex: 0,
    pointerEvents: 'none',
  },
  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: BADGES_OVERLAP + 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    position: 'relative',
    zIndex: 2,
    paddingHorizontal: 20,
    paddingTop: 0,
    marginTop: -BADGES_OVERLAP,
  },
  badgesContainer: {
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgesSecondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 4,
  },
  badgeGold: {
    borderColor: 'rgba(212, 175, 55, 0.55)',
    backgroundColor: '#1E1910',
  },
  badgeCompleted: {
    borderColor: 'rgba(52, 199, 89, 0.55)',
    backgroundColor: '#121D15',
  },
  badgeMuted: {
    borderColor: '#383838',
    backgroundColor: '#181818',
  },
  title: {
    fontSize: 23,
    lineHeight: 28,
    marginBottom: 10,
  },
  meta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaRowClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  metaRemoveBtn: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 12,
  },
  metaText: {
    marginLeft: 8,
  },
  description: {
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },

  // ── Subtasks ───────────────────────────────────────────────────────────────
  subtasksSection: {
    gap: 4,
  },
  subtasksHeader: {
    marginBottom: 12,
  },
  subtasksLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 13,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dark[400],
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 16,
  },

  // ── Photos section ─────────────────────────────────────────────────────────
  photosSection: {
    marginTop: 14,
    marginBottom: 6,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  photoThumb: {
    width: (SCREEN_WIDTH - 40 - 10) / 2,
    height: ((SCREEN_WIDTH - 40 - 10) / 2) * 1.3,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: dark[300],
  },
  photoThumbImage: {
    width: '100%',
    height: '100%',
  },
  photoAddThumb: {
    width: (SCREEN_WIDTH - 40 - 10) / 2,
    height: ((SCREEN_WIDTH - 40 - 10) / 2) * 1.3,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,46,0.06)',
  },

  // ── iOS-style bottom sheet ───────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    paddingHorizontal: 20,
    maxHeight: '82%',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.3)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSheetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: {
    gap: 2,
  },
  sheetOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  sheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,46,0.10)',
    marginRight: 13,
  },
  sheetOptionText: {
    flex: 1,
  },
  dangerOption: {
    borderBottomWidth: 0,
  },
  sheetLoading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySheetText: {
    paddingVertical: 24,
    textAlign: 'center',
  },

  // ── Action bar ─────────────────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlined: {
    borderWidth: 1,
  },
  actionBtnFilled: {},

  // ── Collaborators ──────────────────────────────────────────────────────────
  collaboratorsSection: {
    marginVertical: 14,
  },
  collaboratorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collaboratorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  collaboratorCirclePending: {
    borderColor: 'rgba(212, 177, 58, 0.45)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(212, 177, 58, 0.06)',
  },
  pendingCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  pendingCenterText: {
    fontSize: 6.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#D4B13A',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  collaboratorAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  collaboratorInitials: {
    color: '#D4B13A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addCollaboratorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.8,
    borderColor: '#D4B13A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 177, 58, 0.04)',
  },
  addCollabIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCollabEmoji: {
    fontSize: 18,
  },
  addCollabPlus: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4B13A',
    marginLeft: 1,
  },
});
