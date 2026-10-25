import { themedStyleSheet } from '@bucketlist/ui';
import { StyleSheet, Platform } from 'react-native';

export const styles = themedStyleSheet({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#A0A0A0' },
  scroll: { flex: 1 },
  hero: { height: 270, width: '100%' },
  navOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, zIndex: 10,
  },
  heroBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(13,13,13,0.55)', justifyContent: 'center', alignItems: 'center',
  },
  chipsContainer: {
    marginTop: -17,
    paddingHorizontal: 20,
    zIndex: 10,
    position: 'relative',
  },
  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipsRowSecond: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  chipGold: {
    borderColor: 'rgba(212, 175, 55, 0.55)',
    backgroundColor: '#1E1910',
  },
  chipCompleted: {
    borderColor: 'rgba(52, 199, 89, 0.55)',
    backgroundColor: '#121D15',
  },
  chipMuted: {
    borderColor: '#383838',
    backgroundColor: '#181818',
  },
  chipPressable: { borderColor: '#383838' },
  chipStatus: { borderColor: 'rgba(212, 175, 55, 0.55)', backgroundColor: '#1E1910' },
  chipShared: { borderColor: '#6B5A22', backgroundColor: 'rgba(212, 177, 58, 0.12)' },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#F2EFE8' },
  chipStatusText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  chipSharedText: { fontFamily: 'Inter_500Medium', fontSize: 12, color: '#D4B13A' },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, lineHeight: 40,
    color: '#F3EEE3', marginTop: 18, marginHorizontal: 20,
  },
  titleInput: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, lineHeight: 40,
    color: '#F3EEE3', marginTop: 14, marginHorizontal: 20, padding: 0,
  },
  albumDescription: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#A0A0A0', marginTop: 6, marginHorizontal: 20,
  },
  albumDescriptionInput: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#C0BAAF', marginTop: 6, marginHorizontal: 20, padding: 0,
  },
  collaboratorsSection: { marginHorizontal: 20, marginTop: 14 },
  collaboratorsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collaboratorCircle: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#D4B13A',
    backgroundColor: '#181818', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  collaboratorCirclePending: {
    borderColor: 'rgba(212, 177, 58, 0.45)', borderStyle: 'dashed', backgroundColor: '#141414',
  },
  pendingCenterOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
  },
  pendingCenterText: {
    fontSize: 6.5, fontFamily: 'Inter_600SemiBold', color: '#D4B13A',
    letterSpacing: 0.2, textAlign: 'center', textTransform: 'uppercase',
  },
  collaboratorAvatarImg: { width: 46, height: 46, borderRadius: 23 },
  collaboratorInitials: { color: '#D4B13A', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  addCollaboratorCircle: {
    width: 50, height: 50, borderRadius: 25, borderWidth: 1.8, borderColor: '#D4B13A',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212, 177, 58, 0.04)',
  },
  addCollabIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  addCollabEmoji: { fontSize: 18 },
  addCollabPlus: { fontSize: 16, fontWeight: '800', color: '#D4B13A', marginLeft: 1 },
  progressCard: {
    marginTop: 18, marginHorizontal: 20, paddingVertical: 16, paddingHorizontal: 18,
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  progressPercent: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 36, lineHeight: 40, color: '#D4B13A' },
  progressRight: { flex: 1 },
  progressTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#F3EEE3' },
  progressBarTrack: {
    height: 6, borderRadius: 3, backgroundColor: '#2A2A2A', marginTop: 8, marginBottom: 6, width: '100%',
  },
  progressBarFill: { height: '100%', borderRadius: 3, backgroundColor: '#D4B13A' },
  progressSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#A0A0A0' },
  toggleAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 12, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1, borderColor: '#383218', backgroundColor: 'rgba(212, 177, 58, 0.08)',
  },
  toggleAllBtnActive: { borderColor: '#423719', backgroundColor: 'rgba(212, 177, 58, 0.12)' },
  toggleAllBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#D4B13A' },
  sectionContainer: { marginTop: 24 },
  sectionHeader: {
    paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitleLeft: {
    fontFamily: 'PlayfairDisplay_700Bold', fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase',
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#D4B13A' },
  taskList: { paddingHorizontal: 20, paddingTop: 10, gap: 10 },
  taskListDraggable: { paddingHorizontal: 20, paddingTop: 10 },
  tasksToolbarWrap: { marginTop: 20, paddingHorizontal: 20 },
  tasksToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarIconBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#262626', justifyContent: 'center', alignItems: 'center',
  },
  toolbarLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8F8F8F' },
  toolbarSortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toolbarSortText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#D4B13A' },
  taskSearchBox: {
    marginTop: 12, height: 44, borderRadius: 999, backgroundColor: '#151515',
    borderWidth: 1, borderColor: '#262626', paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  taskSearchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: '#F3EEE3', padding: 0 },
  noResultsText: {
    marginTop: 28, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 14, color: '#8F8F8F',
  },
  sortMenu: {
    position: 'absolute', minWidth: 190, backgroundColor: '#1C1C1C', borderRadius: 12,
    borderWidth: 1, borderColor: '#2E2E2E', overflow: 'hidden',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  sortMenuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  sortMenuItemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.1)' },
  sortMenuText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#F3EEE3' },
  taskCard: {
    minHeight: 76, borderRadius: 16, borderWidth: 1, borderColor: '#262626',
    backgroundColor: '#151515', padding: 10, paddingRight: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  taskThumbContainer: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  taskThumb: { flex: 1 },
  taskContent: { flex: 1, justifyContent: 'center' },
  taskTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold', fontSize: 18, lineHeight: 22, color: '#F3EEE3',
  },
  taskSub: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#A0A0A0', marginTop: 3 },
  taskStepsTrack: { height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', marginTop: 8, width: '100%' },
  taskStepsFill: { height: '100%', borderRadius: 2, backgroundColor: '#D4B13A' },
  taskBadge: {
    height: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1,
    borderColor: '#6B5A22', justifyContent: 'center', alignItems: 'center',
  },
  taskBadgeText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#D4B13A' },
  checkCircleTouch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkCircleDone: { backgroundColor: '#D4B13A' },
  checkCircleEmpty: {
    borderWidth: 1.5, borderColor: '#4A4A4A', backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0D0D0D', borderTopWidth: 1, borderTopColor: '#262626',
    paddingTop: 14, paddingHorizontal: 20, flexDirection: 'row', gap: 12,
    ...Platform.select({
      web: {
        maxWidth: 620,
        marginHorizontal: 'auto',
        alignSelf: 'center',
        left: 0,
        right: 0,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
      } as any,
    }),
  },
  btnEdit: {
    height: 56, borderRadius: 999, borderWidth: 1, borderColor: '#D4B13A',
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  btnEditText: { fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#D4B13A' },
  btnAdd: {
    height: 56, borderRadius: 999, backgroundColor: '#D4B13A',
    flex: 1.4, justifyContent: 'center', alignItems: 'center',
  },
  btnAddText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#0D0D0D' },
  btnCopyAlbum: {
    height: 56, borderRadius: 999, backgroundColor: '#D4B13A', flex: 1,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  btnCopyAlbumText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#0D0D0D' },
  readOnlyDoneBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center',
  },
  taskAddedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, backgroundColor: 'rgba(212, 177, 58, 0.12)',
    borderWidth: 1, borderColor: 'rgba(212, 177, 58, 0.35)',
  },
  taskAddedText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#D4B13A' },
  taskAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12,
    paddingVertical: 7, borderRadius: 16, backgroundColor: '#D4B13A',
  },
  taskAddBtnText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#0D0D0D' },
  // Bottom Sheet
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  bottomSheet: {
    maxHeight: '85%', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingHorizontal: 20,
    backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
      } as any,
    }),
  },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingBottom: 24 },
  sheetHandle: {
    alignSelf: 'center', width: 42, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, marginBottom: 8,
  },
  sheetHeaderText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#F3EEE3' },
  sheetCloseBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  sheetOptions: { gap: 2 },
  sheetOption: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#262626',
  },
  sheetIconBox: {
    width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(212,177,58,0.10)', marginRight: 14,
  },
  sheetOptionTexts: { flex: 1 },
  sheetOptionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#F3EEE3', marginBottom: 2 },
  sheetOptionSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8F8F8F' },
});
