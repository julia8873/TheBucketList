import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ChevronLeft, Lock, Search, X } from 'lucide-react-native';
import { EmptyState, SectionLabel, SegmentedControl, fontFamily, gold, useTheme } from '@bucketlist/ui';
import { PersonRow } from '../src/components/PersonRow';
import { FollowButton } from '../src/components/FollowButton';
import { useAuthStore } from '../src/stores/auth.store';
import {
  useAcceptRequest,
  useIncomingRequests,
  useOutgoingRequests,
  usePeopleSearch,
  useRejectRequest,
} from '../src/hooks/useFriends';
import { useFollowUser, useUnfollowUser } from '../src/hooks/useSocial';
import { displayNameOf } from '../src/utils/initials';
import type { PersonResult } from '../src/services/api/friends';

type Tab = 'accounts' | 'requests';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function GoldLabel({ children }: { children: string }) {
  return <Text style={styles.goldLabel}>{children}</Text>;
}

function subtitleFor(person: PersonResult): string {
  const handle = `@${person.username}`;
  if (person.visibility === 'private' && person.follow_status !== 'accepted') {
    return `${handle} · Cuenta privada`;
  }
  const n = person.public_count ?? 0;
  return `${handle} · ${n} ${n === 1 ? 'tarea pública' : 'tareas públicas'}`;
}

export default function FriendsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(params.tab === 'requests' ? 'requests' : 'accounts');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounced = useDebounce(query, 350);
  const term = debounced.trim().replace(/^@/, '');

  const search = usePeopleSearch(debounced);
  const incoming = useIncomingRequests(user?.id);
  const outgoing = useOutgoingRequests(user?.id);
  const accept = useAcceptRequest(user?.id);
  const reject = useRejectRequest(user?.id);
  const follow = useFollowUser();
  const unfollow = useUnfollowUser();

  useEffect(() => {
    if (params.tab === 'requests') setTab('requests');
  }, [params.tab]);

  const incomingList = incoming.data ?? [];
  const outgoingList = outgoing.data ?? [];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/feed' as any));
  const openProfile = (id: string) => router.push(`/profile/${id}` as any);

  // ── Acciones ────────────────────────────────────────────────────────────────
  const onFollowPress = (person: PersonResult) => {
    if (!user) return;
    const vars = { followerId: user.id, followingId: person.id, targetIsPrivate: person.visibility === 'private' };
    const fail = (error: any) => Alert.alert('No se pudo completar', error?.message ?? 'Inténtalo de nuevo.');

    if (person.follow_status === 'accepted') {
      Alert.alert(`¿Dejar de seguir a ${displayNameOf(person)}?`, undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Dejar de seguir', style: 'destructive', onPress: () => unfollow.mutate(vars, { onError: fail }) },
      ]);
    } else if (person.follow_status === 'pending') {
      unfollow.mutate(vars, { onError: fail }); // cancelar solicitud
    } else {
      follow.mutate(vars, { onError: fail });
    }
  };

  const runRequestAction = (id: string, action: () => void) => {
    setBusyId(id);
    action();
  };

  const requestsCount = incomingList.length;
  const refreshing = incoming.isRefetching || outgoing.isRefetching;

  // ── Pestaña "Cuentas" ───────────────────────────────────────────────────────
  const renderAccounts = () => {
    if (term.length < 2) {
      return (
        <EmptyState
          icon={Search}
          title="Encuentra a tus amigos"
          message="Busca por nombre o por @usuario para seguirles y ver sus momentos."
        />
      );
    }
    if (search.isLoading || (query.trim() !== debounced.trim() && !search.data)) {
      return <ActivityIndicator style={styles.loader} color={gold[400]} />;
    }
    if (search.isError) {
      return (
        <EmptyState
          title="No se pudo buscar"
          message="Inténtalo de nuevo en unos segundos."
          actionLabel="Reintentar"
          onAction={() => void search.refetch()}
        />
      );
    }

    const results = search.data ?? [];
    return (
      <View>
        <SectionLabel highlight="Resultados" rest={`para «${term}»`} style={styles.sectionLabel} />
        {results.length === 0 ? (
          <Text style={styles.empty}>Nadie coincide con «{term}».</Text>
        ) : (
          results.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              subtitle={subtitleFor(person)}
              onPress={() => openProfile(person.id)}
              right={
                <FollowButton
                  status={person.follow_status}
                  isPrivate={person.visibility === 'private'}
                  onPress={() => onFollowPress(person)}
                />
              }
            />
          ))
        )}

        <View style={styles.note}>
          <Lock size={16} color={gold[400]} strokeWidth={1.8} />
          <Text style={styles.noteText}>De las cuentas privadas solo verás sus tareas cuando acepten tu solicitud.</Text>
        </View>
      </View>
    );
  };

  // ── Pestaña "Solicitudes" ───────────────────────────────────────────────────
  const renderRequests = () => {
    if ((incoming.isLoading || outgoing.isLoading) && !incoming.data && !outgoing.data) {
      return <ActivityIndicator style={styles.loader} color={gold[400]} />;
    }
    if (incomingList.length === 0 && outgoingList.length === 0) {
      return (
        <EmptyState
          title="Sin solicitudes pendientes"
          message="Cuando alguien con cuenta privada quiera seguirte, o tú solicites seguir a alguien, aparecerá aquí."
        />
      );
    }

    return (
      <View>
        <View style={styles.sectionLabel}>
          <GoldLabel>{`Recibidas · ${incomingList.length}`}</GoldLabel>
        </View>
        {incomingList.length === 0 ? (
          <Text style={styles.empty}>No tienes solicitudes por responder.</Text>
        ) : (
          incomingList.map(({ person }) => {
            const busy = busyId === person.id && (accept.isPending || reject.isPending);
            return (
              <PersonRow
                key={person.id}
                person={person}
                subtitle={`@${person.username} · quiere seguirte`}
                onPress={() => openProfile(person.id)}
                right={
                  busy ? (
                    <ActivityIndicator color={gold[400]} />
                  ) : (
                    <>
                      <Pressable
                        onPress={() =>
                          runRequestAction(person.id, () =>
                            reject.mutate(person.id, {
                              onError: (e: any) => Alert.alert('No se pudo rechazar', e?.message ?? ''),
                            })
                          )
                        }
                        style={[styles.roundButton, styles.rejectButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Rechazar solicitud"
                      >
                        <X size={18} color="#CFCFCF" strokeWidth={2} />
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          runRequestAction(person.id, () =>
                            accept.mutate(person.id, {
                              onError: (e: any) => Alert.alert('No se pudo aceptar', e?.message ?? ''),
                            })
                          )
                        }
                        style={[styles.roundButton, styles.acceptButton]}
                        accessibilityRole="button"
                        accessibilityLabel="Aceptar solicitud"
                      >
                        <Check size={18} color="#111111" strokeWidth={2.4} />
                      </Pressable>
                    </>
                  )
                }
              />
            );
          })
        )}

        <View style={[styles.sectionLabel, { marginTop: 26 }]}>
          <GoldLabel>{`Enviadas · ${outgoingList.length}`}</GoldLabel>
        </View>
        {outgoingList.length === 0 ? (
          <Text style={styles.empty}>No has enviado solicitudes.</Text>
        ) : (
          outgoingList.map(({ person }) => (
            <PersonRow
              key={person.id}
              person={person}
              subtitle={`@${person.username} · esperando respuesta`}
              onPress={() => openProfile(person.id)}
              right={
                <Pressable
                  onPress={() =>
                    user &&
                    unfollow.mutate(
                      { followerId: user.id, followingId: person.id },
                      { onError: (e: any) => Alert.alert('No se pudo cancelar', e?.message ?? '') }
                    )
                  }
                  style={styles.cancelButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar solicitud"
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
              }
            />
          ))
        )}
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft size={22} color="#F2EFE8" strokeWidth={2} />
        </Pressable>

        {tab === 'accounts' ? (
          <View style={[styles.searchField, (focused || query.length > 0) && { borderColor: gold[400] }]}>
            <Search size={18} color="#9A9A9A" strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Buscar personas"
              placeholderTextColor="#7A7A7A"
              autoFocus={params.tab !== 'requests'}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
              selectionColor={gold[400]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                <X size={18} color="#9A9A9A" strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.title}>Amigos</Text>
        )}
      </View>

      <View style={styles.segment}>
        <SegmentedControl
          options={[
            { key: 'accounts', label: 'Cuentas' },
            { key: 'requests', label: requestsCount > 0 ? `Solicitudes · ${requestsCount}` : 'Solicitudes' },
          ]}
          selected={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          tab === 'requests' ? (
            <RefreshControl
              refreshing={refreshing}
              tintColor={gold[400]}
              onRefresh={() => {
                void incoming.refetch();
                void outgoing.refetch();
              }}
            />
          ) : undefined
        }
      >
        {tab === 'accounts' ? renderAccounts() : renderRequests()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  searchInput: { flex: 1, fontFamily: fontFamily.regular, fontSize: 16, color: '#FFFFFF', paddingVertical: 0 },
  title: { fontFamily: fontFamily.serifBold, fontSize: 32, color: '#FFFFFF', letterSpacing: -0.3 },
  segment: { paddingHorizontal: 16, paddingBottom: 6 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 48, flexGrow: 1 },
  sectionLabel: { marginBottom: 4 },
  goldLabel: {
    fontFamily: fontFamily.serifBold,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: gold[400],
  },
  loader: { marginTop: 40 },
  empty: { fontFamily: fontFamily.regular, fontSize: 14, color: '#9A9A9A', paddingVertical: 16 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
  },
  noteText: { flex: 1, fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 19, color: '#CFCFCF' },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rejectButton: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A' },
  acceptButton: { backgroundColor: gold[400] },
  cancelButton: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cancelText: { fontFamily: fontFamily.semibold, fontSize: 14, color: '#CFCFCF' },
});
