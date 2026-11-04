import { themedStyleSheet } from '@bucketlist/ui';
import { StyleSheet } from 'react-native';

export const styles = themedStyleSheet({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#8A8A8A',
  },
  loaderContainer: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.85,
    alignItems: 'center',
    paddingTop: 3,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayCircleSelected: {
    borderColor: '#D4B13A',
    borderWidth: 1.5,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  dayCircleToday: {
    borderColor: '#383838',
    borderWidth: 1,
  },
  dayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F3EEE3',
  },
  dayTextSelected: {
    color: '#D4B13A',
    fontFamily: 'Inter_700Bold',
  },
  dayTextToday: {
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  dayTextOutside: {
    color: '#3F3F3F',
  },
  dotsRow: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 3,
    height: 6,
    alignItems: 'center',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 16,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
  },
  sectionHeader: {
    paddingHorizontal: 12,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  tasksContainer: {
    paddingHorizontal: 12,
  },
  emptyDayContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyDayText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#707070',
    textAlign: 'center',
  },
  expiredSection: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  expiredDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  expiredSectionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
  },
  unscheduledSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 14,
  },
  unscheduledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  unscheduledTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 13,
    color: '#8A8A8A',
    letterSpacing: 0.6,
  },
});
