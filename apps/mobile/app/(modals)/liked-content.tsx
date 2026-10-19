import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Heart, Images, CheckCircle2 } from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { useLikedContent } from '../../src/hooks/useSocial';
import { FeedCard } from '../../src/components/FeedCard';
import { AlbumFeedCard } from '../../src/components/AlbumFeedCard';

export default function LikedContentScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, session } = useAuthStore();
  const userId = user?.id || session?.user?.id;
  const [activeTab, setActiveTab] = useState<'tasks' | 'albums'>('tasks');

  const { data, isLoading, refetch, isRefetching } = useLikedContent(userId);

  const tasks = data?.tasks ?? [];
  const albums = data?.albums ?? [];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>Me gusta</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segment Tabs */}
      <View style={styles.segmentWrapper}>
        <View style={[styles.segmentContainer, { backgroundColor: theme.dark ? '#1A1A1A' : '#EFECE6', borderColor: theme.colors.border }]}>
          <Pressable
            onPress={() => setActiveTab('tasks')}
            style={[
              styles.segmentBtn,
              activeTab === 'tasks' && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <CheckCircle2
              size={15}
              color={activeTab === 'tasks' ? gold[400] : theme.colors.foregroundMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'tasks' ? theme.colors.foreground : theme.colors.foregroundMuted },
                activeTab === 'tasks' && styles.segmentTextActive,
              ]}
            >
              Tareas ({tasks.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('albums')}
            style={[
              styles.segmentBtn,
              activeTab === 'albums' && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <Images
              size={15}
              color={activeTab === 'albums' ? gold[400] : theme.colors.foregroundMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === 'albums' ? theme.colors.foreground : theme.colors.foregroundMuted },
                activeTab === 'albums' && styles.segmentTextActive,
              ]}
            >
              Álbumes ({albums.length})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={gold[400]} />
        </View>
      ) : activeTab === 'tasks' ? (
        tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.dark ? '#1E1E1E' : '#F5F2EB' }]}>
              <Heart size={32} color={gold[400]} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>Sin tareas con me gusta</Text>
            <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
              Cuando des me gusta a las tareas de amigos o en explorar, aparecerán aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={isRefetching}
            onRefresh={refetch}
            renderItem={({ item, index }) => (
              <FeedCard
                event={item}
                index={index}
                onPress={() => router.push(`/bucket/${item.bucket.id}` as any)}
              />
            )}
          />
        )
      ) : albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.dark ? '#1E1E1E' : '#F5F2EB' }]}>
            <Images size={32} color={gold[400]} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>Sin álbumes con me gusta</Text>
          <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
            Los álbumes a los que des like en momentos de amigos o explorar aparecerán aquí.
          </Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item, index }) => (
            <AlbumFeedCard
              album={item}
              colorIndex={index}
              isLiked={true}
              onPress={() => router.push(`/album/${item.id}` as any)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    letterSpacing: 0.3,
  },
  segmentWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
  segmentTextActive: {
    fontFamily: fontFamily.semibold,
  },
  listContent: {
    paddingBottom: 40,
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
