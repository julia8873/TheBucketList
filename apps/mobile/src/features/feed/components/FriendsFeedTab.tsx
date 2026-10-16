import React from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Users } from 'lucide-react-native';
import { EmptyState, gold } from '@bucketlist/ui';
import { FeedCard } from '../../../components/FeedCard';
import { FeedCardSkeleton } from '../../../components/FeedCardSkeleton';
import { styles } from '../styles/feed.styles';

interface FriendsFeedTabProps {
  headerElement: React.ReactElement;
  isLoading: boolean;
  isError: boolean;
  friendsItems: any[];
  manualRefreshing: boolean;
  onRefresh: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  windowHeight: number;
  onOpenFriends: () => void;
  onRetry: () => void;
  listRef?: React.RefObject<any>;
}

export function FriendsFeedTab({
  headerElement,
  isLoading,
  isError,
  friendsItems,
  manualRefreshing,
  onRefresh,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  windowHeight,
  onOpenFriends,
  onRetry,
  listRef,
}: FriendsFeedTabProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {headerElement}
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </ScrollView>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        {headerElement}
        <EmptyState
          title="No se pudo cargar el feed"
          message="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={onRetry}
        />
      </View>
    );
  }

  return (
    <FlashList
      ref={listRef}
      data={friendsItems}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <FeedCard
          event={item}
          index={index}
          onPress={() => router.push(`/bucket/${item.bucket_id}` as any)}
        />
      )}
      estimatedItemSize={430}
      ListHeaderComponent={headerElement}
      refreshing={manualRefreshing}
      onRefresh={onRefresh}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={gold[400]} />
        ) : null
      }
      ListEmptyComponent={
        <View style={[styles.emptyWrap, { minHeight: windowHeight * 0.45 }]}>
          <EmptyState
            title="Tu feed está tranquilo"
            message="Sigue a tus amigos para ver aquí los momentos que completan."
            icon={Users}
            actionLabel="Buscar personas"
            onAction={onOpenFriends}
          />
        </View>
      }
    />
  );
}
