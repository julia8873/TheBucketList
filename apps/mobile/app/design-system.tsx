/**
 * Design System Showcase — dev-only screen (/design-system)
 * Demonstrates all tokens, themes, and components in one scrollable view.
 * Accessible at http://localhost:8081/design-system during development.
 */
import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Star, Heart, Flame, MapPin, Calendar, Search,
  Check, AlertCircle, Info, Bell, User, Lock, Globe,
  ChevronRight, Plus, Trash2, Edit3, Share2,
} from 'lucide-react-native';

import {
  useTheme,
  Typography,
  Button,
  Card,
  Input,
  Avatar,
  Badge,
  Divider,
  Skeleton,
  ProgressBar,
  EmptyState,
  Icon,
  spacing,
  gold as orange,  // orange was renamed gold
  categoryColors,
  REACTION_EMOJIS,
} from '@bucketlist/ui';

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={styles.section}>
      <Typography variant="label" color={theme.colors.primary} style={styles.sectionLabel}>
        {title}
      </Typography>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function Row({ children, wrap = false }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <View style={[styles.row, wrap && styles.rowWrap]}>
      {children}
    </View>
  );
}

// ─── Color swatch ────────────────────────────────────────────────────────────

function Swatch({ color, label }: { color: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.swatchWrap}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: theme.colors.border }]} />
      <Typography variant="caption" color={theme.colors.foregroundMuted} align="center" style={styles.swatchLabel}>
        {label}
      </Typography>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function DesignSystemScreen() {
  const { theme, colorScheme, setColorScheme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [loadingBtn, setLoadingBtn] = useState(false);

  const isDark = colorScheme === 'dark';

  const simulateLoading = () => {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface, borderBottomColor: theme.colors.border }]}>
        <View>
          <Typography variant="h3" color={theme.colors.foreground}>
            Design System
          </Typography>
          <Typography variant="sm" color={theme.colors.foregroundMuted}>
            TheBucketList · Phase 1
          </Typography>
        </View>

        {/* Theme toggle */}
        <Pressable
          style={[
            styles.themeToggle,
            { backgroundColor: theme.colors.secondary, borderColor: theme.colors.border },
          ]}
          onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
          accessibilityRole="switch"
          accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          accessibilityState={{ checked: isDark }}
        >
          <Typography variant="smMedium" color={theme.colors.foreground}>
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </Typography>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            1. COLORS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Colors — Semantic">
          <Row wrap>
            <Swatch color={theme.colors.background} label="background" />
            <Swatch color={theme.colors.surface} label="surface" />
            <Swatch color={theme.colors.surfaceElevated} label="surfaceElevated" />
            <Swatch color={theme.colors.surfaceSunken} label="surfaceSunken" />
            <Swatch color={theme.colors.primary} label="primary" />
            <Swatch color={theme.colors.secondary} label="secondary" />
            <Swatch color={theme.colors.foreground} label="foreground" />
            <Swatch color={theme.colors.foregroundMuted} label="muted" />
            <Swatch color={theme.colors.foregroundSubtle} label="subtle" />
            <Swatch color={theme.colors.border} label="border" />
            <Swatch color={theme.colors.success} label="success" />
            <Swatch color={theme.colors.error} label="error" />
            <Swatch color={theme.colors.warning} label="warning" />
            <Swatch color={theme.colors.info} label="info" />
          </Row>
        </Section>

        <Divider style={styles.divider} />

        <Section title="Colors — Raw Palette">
          <Typography variant="smMedium" color={theme.colors.foregroundMuted} style={{ marginBottom: 8 }}>
            Orange
          </Typography>
          <Row wrap>
            {Object.entries(orange).map(([k, v]) => (
              <Swatch key={k} color={v} label={k} />
            ))}
          </Row>
          <Typography variant="smMedium" color={theme.colors.foregroundMuted} style={{ marginTop: 12, marginBottom: 8 }}>
            Categories
          </Typography>
          <Row wrap>
            {Object.entries(categoryColors).map(([k, v]) => (
              <Swatch key={k} color={v} label={k} />
            ))}
          </Row>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            2. TYPOGRAPHY
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Typography">
          <View style={{ gap: 12 }}>
            <Typography variant="h1">h1 — The Bucket List</Typography>
            <Typography variant="h2">h2 — Your life, your list</Typography>
            <Typography variant="h3">h3 — Add a new dream</Typography>
            <Typography variant="h4">h4 — Hike Machu Picchu</Typography>
            <Divider />
            <Typography variant="body">body — Track what you want to do, share it with friends, and actually do it.</Typography>
            <Typography variant="bodyMedium">bodyMedium — Track what you want to do, share it with friends, and actually do it.</Typography>
            <Typography variant="bodySemibold">bodySemibold — Track what you want to do, share it with friends.</Typography>
            <Divider />
            <Typography variant="sm">sm — Added 3 days ago · 12 reactions</Typography>
            <Typography variant="smMedium">smMedium — Expires in 7 days</Typography>
            <Typography variant="caption" color={theme.colors.foregroundMuted}>caption — Last updated just now</Typography>
            <Typography variant="label">label — Category</Typography>
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            3. BUTTONS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Buttons — Variants">
          <Row wrap>
            <Button variant="primary" onPress={() => {}}>Primary</Button>
            <Button variant="secondary" onPress={() => {}}>Secondary</Button>
            <Button variant="ghost" onPress={() => {}}>Ghost</Button>
            <Button variant="destructive" onPress={() => {}}>Destructive</Button>
            <Button variant="link" onPress={() => {}}>Link</Button>
          </Row>
        </Section>

        <Section title="Buttons — Sizes">
          <Row wrap>
            <Button variant="primary" size="sm" onPress={() => {}}>Small</Button>
            <Button variant="primary" size="md" onPress={() => {}}>Medium</Button>
            <Button variant="primary" size="lg" onPress={() => {}}>Large</Button>
          </Row>
        </Section>

        <Section title="Buttons — States">
          <Row wrap>
            <Button variant="primary" loading={loadingBtn} onPress={simulateLoading}>
              {loadingBtn ? 'Loading…' : 'Tap to load'}
            </Button>
            <Button variant="primary" disabled onPress={() => {}}>Disabled</Button>
            <Button
              variant="primary"
              leftIcon={<Icon icon={Plus} size="sm" color="#fff" />}
              onPress={() => {}}
            >
              Add item
            </Button>
            <Button
              variant="secondary"
              rightIcon={<Icon icon={ChevronRight} size="sm" color={theme.colors.foreground} />}
              onPress={() => {}}
            >
              See all
            </Button>
          </Row>
        </Section>

        <Section title="Buttons — Full Width">
          <View style={{ gap: 8 }}>
            <Button variant="primary" size="lg" fullWidth onPress={() => {}}>
              Get started
            </Button>
            <Button variant="secondary" size="lg" fullWidth onPress={() => {}}>
              Sign in instead
            </Button>
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            4. INPUTS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Inputs">
          <View style={{ gap: 16 }}>
            <Input
              label="What do you want to do?"
              placeholder="e.g. Hike Machu Picchu"
              value={inputValue}
              onChangeText={setInputValue}
            />
            <Input
              label="Location"
              placeholder="Where? (optional)"
              leftIcon={<Icon icon={MapPin} size="sm" color={theme.colors.foregroundMuted} />}
            />
            <Input
              label="Search"
              placeholder="Search users or items…"
              leftIcon={<Icon icon={Search} size="sm" color={theme.colors.foregroundMuted} />}
            />
            <Input
              label="Username"
              value="julia"
              variant="success"
              hint="✓ Username is available"
            />
            <Input
              label="Email"
              value="not-an-email"
              error="Please enter a valid email address"
              keyboardType="email-address"
            />
            <Input
              label="Bio"
              placeholder="Tell us something about you…"
              multiline
              numberOfLines={3}
            />
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            5. CARDS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Cards">
          <View style={{ gap: 12 }}>
            <Card variant="default">
              <Typography variant="bodyMedium">Default card</Typography>
              <Typography variant="sm" color={theme.colors.foregroundMuted}>
                Surface background with soft shadow
              </Typography>
            </Card>
            <Card variant="elevated">
              <Typography variant="bodyMedium">Elevated card</Typography>
              <Typography variant="sm" color={theme.colors.foregroundMuted}>
                Higher elevation for modals and sheets
              </Typography>
            </Card>
            <Card variant="outlined">
              <Typography variant="bodyMedium">Outlined card</Typography>
              <Typography variant="sm" color={theme.colors.foregroundMuted}>
                Border-only, no shadow
              </Typography>
            </Card>

            {/* Bucket item card preview */}
            <Card variant="default">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Row>
                    <Badge label="travel" variant="info" />
                    <Badge label="Pending" variant="default" />
                  </Row>
                  <Typography variant="bodySemibold">Hike the Camino de Santiago</Typography>
                  <Row>
                    <Icon icon={Calendar} size="xs" color={theme.colors.foregroundMuted} />
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>
                      {' '}Expires in 180 days
                    </Typography>
                    <Icon icon={MapPin} size="xs" color={theme.colors.foregroundMuted} style={{ marginLeft: 8 }} />
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>
                      {' '}Spain
                    </Typography>
                  </Row>
                </View>
                <Icon icon={ChevronRight} color={theme.colors.foregroundSubtle} />
              </View>
              <View style={[styles.reactionRow, { borderTopColor: theme.colors.border }]}>
                {REACTION_EMOJIS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={[styles.emojiBtn, { backgroundColor: theme.colors.secondary }]}
                  >
                    <Typography variant="body">{emoji}</Typography>
                  </Pressable>
                ))}
              </View>
            </Card>
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            6. AVATARS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Avatars">
          <Row>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Avatar size="xs" initials="JM" />
              <Typography variant="caption" color={theme.colors.foregroundMuted}>xs</Typography>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Avatar size="sm" initials="JM" />
              <Typography variant="caption" color={theme.colors.foregroundMuted}>sm</Typography>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Avatar size="md" initials="JM" />
              <Typography variant="caption" color={theme.colors.foregroundMuted}>md</Typography>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Avatar size="lg" initials="JM" />
              <Typography variant="caption" color={theme.colors.foregroundMuted}>lg</Typography>
            </View>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Avatar size="xl" initials="JM" />
              <Typography variant="caption" color={theme.colors.foregroundMuted}>xl</Typography>
            </View>
          </Row>
          <Row>
            <Avatar
              size="md"
              initials="MR"
              badge={
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.success }} />
              }
            />
            <Typography variant="sm" color={theme.colors.foregroundMuted} style={{ marginTop: 8 }}>
              {'  '}with online badge
            </Typography>
          </Row>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            7. BADGES
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Badges — Filled">
          <Row wrap>
            <Badge label="Default" variant="default" />
            <Badge label="Primary" variant="primary" />
            <Badge label="Success" variant="success" />
            <Badge label="Error" variant="error" />
            <Badge label="Warning" variant="warning" />
            <Badge label="Info" variant="info" />
          </Row>
        </Section>
        <Section title="Badges — Outlined">
          <Row wrap>
            <Badge label="Default" variant="default" badgeStyle="outlined" />
            <Badge label="Primary" variant="primary" badgeStyle="outlined" />
            <Badge label="Success" variant="success" badgeStyle="outlined" />
            <Badge label="Error" variant="error" badgeStyle="outlined" />
            <Badge label="Warning" variant="warning" badgeStyle="outlined" />
            <Badge label="Info" variant="info" badgeStyle="outlined" />
          </Row>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            8. FEEDBACK COMPONENTS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Skeleton">
          <View style={{ gap: 8 }}>
            <Skeleton height={20} width="60%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="75%" />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={{ flex: 1, gap: 6, justifyContent: 'center' }}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={12} width="50%" />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Progress Bars">
          <View style={{ gap: 16 }}>
            <ProgressBar value={35} label="Storage used" showPercent />
            <ProgressBar value={68} label="Profile complete" showPercent />
            <ProgressBar value={82} label="Storage quota (warning)" showPercent />
            <ProgressBar value={100} label="Completed" showPercent />
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            9. DIVIDERS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Dividers">
          <View style={{ gap: 16 }}>
            <Divider />
            <Divider label="or" />
            <Divider label="Continue with" />
            <View style={{ flexDirection: 'row', height: 48, alignItems: 'center', gap: 12 }}>
              <Typography variant="sm">Left</Typography>
              <Divider orientation="vertical" />
              <Typography variant="sm">Right</Typography>
            </View>
          </View>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            10. ICONS
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Icons (Lucide)">
          <Row wrap>
            {[Star, Heart, Flame, MapPin, Calendar, Bell, User, Lock, Globe,
              Check, AlertCircle, Info, Edit3, Trash2, Share2, Plus, ChevronRight, Search
            ].map((Ico, i) => (
              <View key={i} style={[styles.iconWrap, { backgroundColor: theme.colors.secondary }]}>
                <Icon icon={Ico} size="md" color={theme.colors.foreground} />
              </View>
            ))}
          </Row>
          <Row>
            <Icon icon={Star} size="xs" color={theme.colors.primary} />
            <Icon icon={Star} size="sm" color={theme.colors.primary} />
            <Icon icon={Star} size="md" color={theme.colors.primary} />
            <Icon icon={Star} size="lg" color={theme.colors.primary} />
            <Icon icon={Star} size="xl" color={theme.colors.primary} />
          </Row>
        </Section>

        <Divider style={styles.divider} />

        {/* ═══════════════════════════════════════════════════════════════════
            11. EMPTY STATE
        ════════════════════════════════════════════════════════════════════ */}
        <Section title="Empty State">
          <Card variant="outlined" padding={32}>
            <EmptyState
              title="Your bucket list is empty"
              description="Tap + to add your first dream and start tracking what matters most."
              illustration={
                <Typography variant="h1" style={{ fontSize: 56 }}>🪣</Typography>
              }
              action={
                <Button variant="primary" leftIcon={<Icon icon={Plus} size="sm" color="#fff" />} onPress={() => {}}>
                  Add first item
                </Button>
              }
            />
          </Card>
        </Section>

        {/* Bottom padding */}
        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  themeToggle: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: spacing[5],
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[5],
  },
  section: {
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  sectionLabel: {
    marginBottom: spacing[1],
  },
  sectionContent: {
    gap: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  rowWrap: {
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  divider: {
    marginBottom: spacing[6],
  },
  swatchWrap: {
    alignItems: 'center',
    gap: 4,
    width: 56,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  swatchLabel: {
    fontSize: 9,
  },
  reactionRow: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  emojiBtn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: spacing[4],
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
