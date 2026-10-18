import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Bookmark } from "lucide-react-native";
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
          accessibilityLabel="Volver"
        >
          <ChevronLeft size={24} color={theme.colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>Guardados</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: theme.colors.border }]}>
        {(["tareas", "albumes"] as Tab[]).map((tab) => {
          const label = tab === "tareas" ? "Tareas" : "Álbumes";
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? gold[400] : theme.colors.foregroundMuted },
                  isActive && styles.tabTextActive,
                ]}
              >
                {label}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </Pressable>
          );
        })}
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
            {activeTab === "tareas" ? "No hay tareas guardadas" : "No hay álbumes guardados"}
          </Text>
          <Text style={[styles.emptySub, { color: theme.colors.foregroundMuted }]}>
            {activeTab === "tareas"
              ? "Guarda tareas de otras personas para tenerlas siempre a mano aquí."
              : "Guarda álbumes de otras personas para tenerlos siempre a mano aquí."}
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

const styles = StyleSheet.create({
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
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    position: "relative",
  },
  tabActive: {},
  tabText: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
  },
  tabTextActive: {
    fontFamily: fontFamily.semibold,
    color: gold[400],
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: "20%",
    right: "20%",
    height: 2,
    backgroundColor: gold[400],
    borderRadius: 1,
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
