import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Bookmark, CheckCircle2, Images } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { fontFamily, gold, useTheme } from "@bucketlist/ui";
import { useAuthStore } from "../../src/stores/auth.store";
import {
  useSavedAlbumsList,
  useSavedAlbumIds,
  useToggleSaveAlbum,
  useSavedBucketsList,
  useSavedBucketIds,
  useToggleSaveBucket,
} from "../../src/hooks/useSocial";
import { AlbumFeedCard } from "../../src/components/AlbumFeedCard";
import { FeedCard } from "../../src/components/FeedCard";

type Tab = "tareas" | "albumes";

export default function SavedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { user, session } = useAuthStore();
  const userId = user?.id || session?.user?.id;
  const [activeTab, setActiveTab] = useState<Tab>("tareas");

  // Albums
  const { data: albums, isLoading: albumsLoading, refetch: refetchAlbums, isRefetching: albumsRefetching } =
    useSavedAlbumsList(userId);
  const { data: savedAlbumIds } = useSavedAlbumIds(userId);
  const toggleSaveAlbum = useToggleSaveAlbum();

  // Buckets (tasks)
  const { data: buckets, isLoading: bucketsLoading, refetch: refetchBuckets, isRefetching: bucketsRefetching } =
    useSavedBucketsList(userId);
  const { data: savedBucketIds } = useSavedBucketIds(userId);
  const toggleSaveBucket = useToggleSaveBucket();

  const handleToggleSaveAlbum = (albumId: string) => {
    if (!userId) return;
    const isSaved = (savedAlbumIds || []).includes(albumId);
    toggleSaveAlbum.mutate({ userId, albumId, currentlySaved: isSaved });
  };

  const handleToggleSaveBucket = (bucketId: string) => {
    if (!userId) return;
    const isSaved = (savedBucketIds || []).includes(bucketId);
    toggleSaveBucket.mutate({ userId, bucketId, currentlySaved: isSaved });
  };

  const isLoading = activeTab === "tareas" ? bucketsLoading : albumsLoading;
  const isEmpty =
    activeTab === "tareas"
      ? !buckets || buckets.length === 0
      : !albums || albums.length === 0;

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <ChevronLeft size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>{t('saved.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Segment Tabs */}
      <View style={styles.segmentWrapper}>
        <View style={[styles.segmentContainer, { backgroundColor: theme.dark ? "#1A1A1A" : "#EFECE6", borderColor: theme.colors.border }]}>
          <Pressable
            onPress={() => setActiveTab("tareas")}
            style={[
              styles.segmentBtn,
              activeTab === "tareas" && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <CheckCircle2
              size={15}
              color={activeTab === "tareas" ? gold[400] : theme.colors.foregroundMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === "tareas" ? theme.colors.foreground : theme.colors.foregroundMuted },
                activeTab === "tareas" && styles.segmentTextActive,
              ]}
            >
              {t('saved.tasks_tab')} ({buckets?.length ?? 0})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("albumes")}
            style={[
              styles.segmentBtn,
              activeTab === "albumes" && [styles.segmentBtnActive, { backgroundColor: theme.colors.surface }],
            ]}
          >
            <Images
              size={15}
              color={activeTab === "albumes" ? gold[400] : theme.colors.foregroundMuted}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.segmentText,
                { color: activeTab === "albumes" ? theme.colors.foreground : theme.colors.foregroundMuted },
                activeTab === "albumes" && styles.segmentTextActive,
              ]}
            >
              {t('saved.albums_tab')} ({albums?.length ?? 0})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={gold[400]} />
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: theme.dark ? "#1E1E1E" : "#F5F2EB" }]}>
            <Bookmark size={32} color={gold[400]} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
            {activeTab === "tareas" ? t('saved.empty_tasks_title') : t('saved.empty_albums_title')}
          </Text>
          <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
            {activeTab === "tareas"
              ? t('saved.empty_tasks_desc')
              : t('saved.empty_albums_desc')}
          </Text>
        </View>
      ) : activeTab === "albumes" ? (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={albumsRefetching}
          onRefresh={refetchAlbums}
          renderItem={({ item, index }) => (
            <AlbumFeedCard
              album={item}
              colorIndex={index}
              isSaved={true}
              onToggleSave={() => handleToggleSaveAlbum(item.id)}
              onPress={() => router.push(`/album/${item.id}` as any)}
            />
          )}
        />
      ) : (
        <FlatList
          data={buckets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={bucketsRefetching}
          onRefresh={refetchBuckets}
          renderItem={({ item, index }) => (
            <FeedCard
              event={item}
              index={index}
              mode="list"
              onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = themedStyleSheet({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    borderWidth: 1,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 999,
  },
  segmentBtnActive: {
    shadowColor: "#000",
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
  listContent: { paddingBottom: 40, paddingTop: 12 },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
