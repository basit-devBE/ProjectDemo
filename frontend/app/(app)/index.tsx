import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NaviiAvatar } from '@/components/NaviiAvatar';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accentColor: string;
}

function ActionCard({ title, subtitle, icon, onPress, accentColor }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: accentColor, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.outline} />
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { state } = useAuth();
  const user = state.user;

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.firstName ?? 'Student'}</Text>
            <Text style={styles.subGreeting}>Ready to build your career?</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('./profile')}
            accessibilityLabel="Go to profile"
          >
            <NaviiAvatar
              seed={user?.id}
              size={44}
              fallback={initials}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>Career Readiness Score</Text>
              <Text style={styles.scoreValue}>—</Text>
            </View>
            <View style={styles.scoreBadge}>
              <Ionicons name="trending-up" size={20} color={colors.onPrimary} />
            </View>
          </View>
          <Text style={styles.scoreHint}>Complete milestones to grow your score.</Text>
        </View>

        <Text style={styles.sectionTitle}>Your Career Tools</Text>

        <ActionCard
          title="Career Roadmap"
          subtitle="View or generate your semester-by-semester plan"
          icon="map-outline"
          accentColor={colors.secondary}
          onPress={() => router.push('./career-paths')}
        />

        <ActionCard
          title="Skill Gap Analysis"
          subtitle="Upload your CV and see what skills you're missing"
          icon="document-text-outline"
          accentColor={colors.tertiary}
          onPress={() => {}}
        />

        <ActionCard
          title="Portfolio"
          subtitle="Showcase projects, certs, and achievements"
          icon="folder-open-outline"
          accentColor={colors.primary}
          onPress={() => {}}
        />

        <ActionCard
          title="Mock Interviews"
          subtitle="Practice with AI-powered interview feedback"
          icon="mic-outline"
          accentColor={colors.error}
          onPress={() => {}}
        />

        <ActionCard
          title="Internship Matches"
          subtitle="Discover opportunities matched to your profile"
          icon="briefcase-outline"
          accentColor={colors.secondary}
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.headlineSm,
    color: colors.primary,
  },
  subGreeting: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  scoreCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreValue: {
    ...typography.displayLg,
    color: colors.secondary,
    marginTop: spacing.sm,
  },
  scoreHint: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  sectionTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
