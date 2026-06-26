import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { getReport, deleteReport } from '@/services/skillGap';
import { type GapReport, type SkillGapItem, type RecommendationResponse } from '@/types/skillGap';

const RESOURCE_TYPE_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  COURSE:   { icon: 'school-outline',      color: colors.tertiary },
  BOOK:     { icon: 'book-outline',        color: colors.secondary },
  PROJECT:  { icon: 'code-slash-outline',  color: colors.primary },
};

function getTypeConfig(type: string) {
  return RESOURCE_TYPE_CONFIG[type] ?? { icon: 'link-outline' as const, color: colors.onSurfaceVariant };
}

function RecommendationRow({ rec }: { rec: RecommendationResponse }) {
  const cfg = getTypeConfig(rec.type);
  return (
    <View style={styles.recRow}>
      <View style={[styles.recIconWrap, { backgroundColor: `${cfg.color}12` }]}>
        <Ionicons name={cfg.icon} size={14} color={cfg.color} />
      </View>
      <Text style={styles.recTitle} numberOfLines={2}>{rec.title}</Text>
      {rec.url ? (
        <TouchableOpacity
          style={styles.recLink}
          onPress={() => Linking.openURL(rec.url!)}
          activeOpacity={0.7}
        >
          <Ionicons name="open-outline" size={14} color={colors.tertiary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function GapCard({ gap, index }: { gap: SkillGapItem; index: number }) {
  return (
    <View style={styles.gapCard}>
      <View style={styles.gapHeader}>
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{gap.importanceRank}</Text>
        </View>
        <Text style={styles.skillName}>{gap.skillName}</Text>
      </View>
      <Text style={styles.gapDescription}>{gap.description}</Text>
      {gap.recommendations.length > 0 && (
        <>
          <View style={styles.divider} />
          <Text style={styles.recsLabel}>Resources</Text>
          {gap.recommendations.map(rec => (
            <RecommendationRow key={rec.id} rec={rec} />
          ))}
        </>
      )}
    </View>
  );
}

export default function GapReportScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const { state } = useAuth();
  const token = state.accessToken;

  const [report, setReport] = useState<GapReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!token || !reportId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getReport(token, reportId);
      setReport(data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  }, [token, reportId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        router.navigate('/(app)/skill-gap');
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const handleDelete = useCallback(() => {
    if (!token || !reportId) return;
    Alert.alert(
      'Delete Analysis',
      `This will permanently remove the gap analysis for "${report?.targetRole ?? 'this report'}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteReport(token, reportId);
              router.navigate('/(app)/skill-gap');
            } catch (e: any) {
              setError(e.message ?? 'Failed to delete report');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  }, [token, reportId, report?.targetRole]);

  const sortedGaps = report
    ? [...report.gaps].sort((a, b) => a.importanceRank - b.importanceRank)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(app)/skill-gap')} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {report?.targetRole ?? 'Gap Report'}
          </Text>
          {report && (
            <Text style={styles.headerSubtitle}>
              {sortedGaps.length} {sortedGaps.length === 1 ? 'gap' : 'gaps'} identified
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={isDeleting || isLoading}
          style={styles.deleteBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={isDeleting || isLoading ? colors.outline : colors.error}
          />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.secondary} />
          <Text style={styles.loadingText}>Loading report…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchReport} activeOpacity={0.8}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {sortedGaps.map((gap, index) => (
            <GapCard key={gap.id} gap={gap} index={index} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  backBtn: {
    padding: spacing.xs,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  headerSubtitle: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  gapCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  gapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: `${colors.secondary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    ...typography.labelSm,
    color: colors.secondary,
  },
  skillName: {
    ...typography.headlineSm,
    color: colors.onSurface,
    flex: 1,
  },
  gapDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.sm,
  },
  recsLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
    flex: 1,
  },
  recLink: {
    padding: spacing.xs,
  },
});
