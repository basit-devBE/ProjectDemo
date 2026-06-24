import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';

interface ActionCardProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  badge?: string;
  badgeColor?: string;
  onPress: () => void;
}

function ActionCard({ title, subtitle, icon, accentColor, badge, badgeColor, onPress }: ActionCardProps) {
  const bc = badgeColor ?? colors.onSurfaceVariant;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconCircle, { backgroundColor: `${accentColor}18` }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {badge && (
            <View style={[styles.cardBadge, { backgroundColor: `${bc}15`, borderColor: `${bc}35` }]}>
              <Text style={[styles.cardBadgeText, { color: bc }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.outline} />
    </TouchableOpacity>
  );
}

function StatTile({ label, value, icon, color }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { state } = useAuth();
  const user = state.user;
  const roleLabel = user?.role ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : 'Student';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.logoMark}>
            <Ionicons name="compass" size={18} color={colors.onPrimary} />
          </View>
          <Text style={styles.brandName}>SkillBridge</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingHello}>{greeting},</Text>
            <Text style={styles.greetingName}>{user?.firstName ?? 'Student'} 👋</Text>
          </View>
          <View style={styles.roleBadge}>
            <Ionicons name="school-outline" size={12} color={colors.secondary} />
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Career Readiness Hero Card */}
        <View style={styles.readinessCard}>
          <View style={styles.readinessTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.readinessLabel}>CAREER READINESS SCORE</Text>
              <Text style={styles.readinessValue}>—</Text>
              <Text style={styles.readinessHint}>Complete milestones to grow your score</Text>
            </View>
            <View style={styles.readinessBadge}>
              <Ionicons name="trending-up" size={24} color={colors.secondary} />
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '0%' }]} />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <StatTile label="Done" value="—" icon="checkmark-circle-outline" color={colors.secondary} />
          <StatTile label="Active" value="—" icon="time-outline" color={colors.tertiary} />
          <StatTile label="Streak" value="—" icon="flame-outline" color="#F59E0B" />
          <StatTile label="XP" value="—" icon="star-outline" color={colors.primary} />
        </View>

        {/* Tools */}
        <Text style={styles.sectionTitle}>Your Career Tools</Text>

        <ActionCard
          title="Career Roadmap"
          subtitle="View your semester-by-semester AI plan"
          icon="map-outline"
          accentColor={colors.secondary}
          badge="Active"
          badgeColor={colors.secondary}
          onPress={() => router.push('./roadmap')}
        />
        <ActionCard
          title="Choose Career Path"
          subtitle="Generate or regenerate your roadmap"
          icon="compass-outline"
          accentColor={colors.tertiary}
          onPress={() => router.push('./career-paths')}
        />
        <ActionCard
          title="Skill Gap Analysis"
          subtitle="Upload your CV and discover missing skills"
          icon="document-text-outline"
          accentColor="#F59E0B"
          badge="Soon"
          onPress={() => {}}
        />
        <ActionCard
          title="Portfolio Builder"
          subtitle="Showcase projects, certs and achievements"
          icon="folder-open-outline"
          accentColor={colors.primary}
          badge="Soon"
          onPress={() => {}}
        />
        <ActionCard
          title="Mock Interviews"
          subtitle="AI-powered practice with instant feedback"
          icon="mic-outline"
          accentColor={colors.error}
          badge="Soon"
          onPress={() => {}}
        />
        <ActionCard
          title="Internship Matches"
          subtitle="Opportunities tailored to your profile"
          icon="briefcase-outline"
          accentColor="#8B5CF6"
          badge="Soon"
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: { ...typography.headlineSm, color: colors.primary },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 24 },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greetingHello: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  greetingName: { ...typography.headlineMd, color: colors.primary, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  roleBadgeText: { ...typography.labelSm, color: colors.secondary },

  readinessCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  readinessTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  readinessLabel: {
    ...typography.labelSm,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  readinessValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 44,
    lineHeight: 52,
    color: colors.onPrimary,
    marginBottom: spacing.xs,
  },
  readinessHint: { ...typography.labelMd, color: 'rgba(255,255,255,0.55)' },
  readinessBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, lineHeight: 24, color: colors.primary },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, textAlign: 'center', fontSize: 10 },

  sectionTitle: { ...typography.headlineSm, color: colors.primary, marginBottom: spacing.md },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: spacing.md,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  cardTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, lineHeight: 20, color: colors.primary },
  cardBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  cardBadgeText: { ...typography.labelSm, fontSize: 10 },
  cardSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
});
