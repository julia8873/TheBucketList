import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, TextInput, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Typography, useTheme, spacing, Avatar, radii, Icon } from '@bucketlist/ui';
import { Search } from 'lucide-react-native';
import { useSearchUsers } from '../../src/hooks/useSocial';
import { useExploreFeed } from '../../src/hooks/useFeed';
import { FeedCard } from '../../src/components/FeedCard';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ExploreScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: exploreData, fetchNextPage, hasNextPage, isFetchingNextPage } = useExploreFeed();
  const { data: searchResults, isLoading: isSearchLoading } = useSearchUsers(debouncedSearch);

  const buckets = exploreData?.pages.flatMap((page) => page.items) || [];

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
          Explorar
        </Typography>
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon icon={Search} size={20} color={theme.colors.foregroundMuted} />
          <TextInput
            placeholder="Buscar personas e ideas"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.colors.foreground }]}
            placeholderTextColor={theme.colors.foregroundMuted}
          />
        </View>
      </View>

      {debouncedSearch.length >= 2 ? (
        // Search Results
        <View style={styles.searchResults}>
          {isSearchLoading ? (
            <ActivityIndicator style={{ marginTop: spacing[4] }} color={theme.colors.primary} />
          ) : (
            <FlatList
              data={searchResults || []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.userRow}
                  onPress={() => router.push(`/profile/${item.id}` as any)}
                >
                  <Avatar
                    source={item.avatar_url ? { uri: item.avatar_url } : undefined}
                    fallback={item.display_name?.charAt(0) || item.username?.charAt(0) || '?'}
                    size="md"
                  />
                  <View style={styles.userInfo}>
                    <Typography variant="body" style={{ fontWeight: 'bold' }}>{item.display_name || item.username}</Typography>
                    <Typography variant="caption" color="textSecondary">@{item.username}</Typography>
                  </View>
                </Pressable>
              )}
              ListEmptyComponent={
                <Typography variant="body" color="textSecondary" style={{ textAlign: 'center', marginTop: spacing[4] }}>
                  No users found.
                </Typography>
              }
            />
          )}
        </View>
      ) : (
        // Explore Feed
        <FlashList
          data={buckets}
          renderItem={({ item, index }) => (
            <FeedCard
              // Fake feed event wrapper to match FeedCard signature
              event={{ actor: item.user, bucket: item, type: 'new_bucket', created_at: item.created_at }}
              index={index}
              onPress={() => router.push(`/bucket/${item.id}` as any)}
            />
          )}
          estimatedItemSize={250}
          onEndReached={() => {
            if (hasNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <Typography variant="h3" style={styles.sectionTitle}>
              Ideas para empezar
            </Typography>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={{ padding: spacing[4] }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: {
    marginBottom: spacing[3],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing[2],
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  userInfo: {
    marginLeft: spacing[3],
  },
  sectionTitle: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
});
