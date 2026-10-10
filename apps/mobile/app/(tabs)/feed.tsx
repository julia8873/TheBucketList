import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Search, Users } from 'lucide-react-native';
import { EmptyState, SectionLabel, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { FeedCard } from '../../src/components/FeedCard';
import { useFeed } from '../../src/hooks/useFeed';
import { useIncomingRequestCount } from '../../src/hooks/useFriends';
import { useUnreadCount } from '../../src/hooks/useNotifications';
import { useAuthStore } from '../../src/stores/auth.store';

function Logo() {
  return (
    <Text style={styles.logo} accessibilityRole="header">
      <Text style={{ color: gold[400] }}>TheBucket</Text>
      <Text style={{ color: '#FFFFFF' }}>List</Text>
    </Text>
  );
}

export default function FeedScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const feed = useFeed(user?.id);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, refetch, isRefetching } = feed;
  const { data: requestCount = 0, refetch: refetchRequests } = useIncomingRequestCount(user?.id);
  const { data: unread = 0 } = useUnreadCount(user?.id);

  // Al volver a la pestaña, refresca el contador de solicitudes.
  useFocusEffect(
    useCallback(() => {
      void refetchRequests();
    }, [refetchRequests])
  );

  const items = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.items) ?? [];
    const seen = new Set<string>();
    const unique: any[] = [];
    for (const item of all) {
      if (item?.bucket_id && !seen.has(item.bucket_id)) {
        seen.add(item.bucket_id);
        unique.push(item);
      }
    }
    return unique;
  }, [data]);

  const openFriends = (tab?: 'requests') =>
    router.push((tab ? `/friends?tab=${tab}` : '/friends') as any);

  const header = (
    <View>
      <View style={styles.topBar}>
        <Logo />
        <View style={styles.topActions}>
          <Pressable
            onPress={() => router.push('/(tabs)/notifications' as any)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Bell size={24} color="#F2EFE8" strokeWidth={1.8} />
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
          <Pressable onPress={() => openFriends()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Buscar personas">
            <Search size={24} color="#F2EFE8" strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => openFriends()}
        style={styles.searchBar}
        accessibilityRole="search"
        accessibilityLabel="Buscar personas"
      >
        <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
        <Text style={styles.searchPlaceholder}>Buscar personas</Text>
        {requestCount > 0 ? (
          <Pressable onPress={() => openFriends('requests')} hitSlop={8} accessibilityRole="button">
            <Text style={styles.requests}>
              {requestCount} {requestCount === 1 ? 'solicitud' : 'solicitudes'}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>

      <SectionLabel highlight="Momentos" rest="de amigos" style={styles.section} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={gold[400]} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {header}
        <EmptyState
          title="No se pudo cargar el feed"
          message="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlashList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <FeedCard event={item} index={index} onPress={() => router.push(`/bucket/${item.bucket_id}` as any)} />
        )}
        estimatedItemSize={430}
        ListHeaderComponent={header}
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={() => {
          void refetch();
          void refetchRequests();
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={gold[400]} /> : null}
        ListEmptyComponent={
          <EmptyState
            title="Tu feed está tranquilo"
            message="Sigue a tus amigos para ver aquí los momentos que completan."
            icon={Users}
            actionLabel="Buscar personas"
            onAction={() => openFriends()}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  logo: { fontFamily: fontFamily.serifBold, fontSize: 26, letterSpacing: -0.3 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  bellDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: gold[400],
    borderWidth: 1.5,
    borderColor: '#0E0E0E',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  searchPlaceholder: { flex: 1, fontFamily: fontFamily.regular, fontSize: 15, color: '#9A9A9A' },
  requests: { fontFamily: fontFamily.semibold, fontSize: 13, color: gold[400] },
  section: { paddingHorizontal: 16, marginTop: 22, marginBottom: 6 },
  footer: { padding: 16 },
});
