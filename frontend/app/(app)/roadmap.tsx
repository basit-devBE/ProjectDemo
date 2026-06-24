import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { getRoadmap, completeMilestone } from '@/services/career';
import { type Milestone, type Roadmap } from '@/types/career';

function getMilestoneIcon(type: Milestone['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'SKILL':
      return 'book-outline';
    case 'PROJECT':
      return 'code-slash-outline';
    case 'CERT':
      return 'trophy-outline';
    case 'EXPERIENCE':
      return 'briefcase-outline';
    default:
      return 'pin-outline';
  }
}

function groupBySemester(milestones: Milestone[]) {
  return milestones.reduce<Record<number, Milestone[]>>((acc, m) => {
    if (!acc[m.semester]) acc[m.semester] = [];
    acc[m.semester].push(m);
    return acc;
  }, {});
}

export default function RoadmapScreen() {
  const { state } = useAuth();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [evidenceNote, setEvidenceNote] = useState('');

  const loadRoadmap = useCallback(async () => {
    if (!state.accessToken || !state.user) {
      setError('You must be logged in to view your roadmap.');
      setLoading(false);
      return;
    }

    try {
      const data = await getRoadmap(state.accessToken, state.user.id);
      setRoadmap(data);
      setError(null);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 404) {
        setError('You do not have a roadmap yet.');
      } else {
        setError(err.message ?? 'Failed to load roadmap.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [state.accessToken, state.user]);

  useEffect(() => {
    setLoading(true);
    loadRoadmap();
  }, [loadRoadmap]);

  async function handleComplete(milestoneId: string) {
    if (!state.accessToken) return;

    setCompletingId(milestoneId);
    try {
      const updated = await completeMilestone(state.accessToken, milestoneId, {
        evidenceNote: evidenceNote.trim() || undefined,
      });
      setEvidenceNote('');
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              progressPercent: updated.progressPercent,
              milestones: prev.milestones.map((m) =>
                m.id === milestoneId ? { ...m, completed: true } : m
              ),
            }
          : null
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert('Error', err.message ?? 'Failed to complete milestone');
    } finally {
      setCompletingId(null);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  if (error && !roadmap) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>{error}</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('./career-paths')}
        >
          <Text style={styles.createButtonText}>Create a Roadmap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!roadmap) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyTitle}>No roadmap found</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('./career-paths')}
        >
          <Text style={styles.createButtonText}>Create a Roadmap</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const grouped = groupBySemester(roadmap.milestones);
  const semesters = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRoadmap(); }} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{roadmap.careerPath}</Text>
            <Text style={styles.subtitle}>Your personalised career roadmap</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressValue}>{roadmap.progressPercent}%</Text>
          </View>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.min(roadmap.progressPercent, 100)}%` },
            ]}
          />
        </View>

        {semesters.map((semester) => (
          <View key={semester} style={styles.semesterSection}>
            <Text style={styles.semesterTitle}>Semester {semester}</Text>
            {grouped[semester]
              .sort((a, b) => a.order - b.order)
              .map((milestone) => (
                <View
                  key={milestone.id}
                  style={[styles.milestoneCard, milestone.completed && styles.milestoneCardCompleted]}
                >
                  <View style={styles.milestoneHeader}>
                    <Ionicons
                      name={getMilestoneIcon(milestone.type)}
                      size={24}
                      color={colors.onSurfaceVariant}
                    />
                    <View style={styles.milestoneMeta}>
                      <Text style={styles.milestoneType}>{milestone.type}</Text>
                      {milestone.completed && (
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedBadgeText}>Done</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  {milestone.description && (
                    <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                  )}

                  {!milestone.completed && (
                    <>
                      <TextInput
                        style={styles.evidenceInput}
                        placeholder="Evidence note (optional)"
                        placeholderTextColor={colors.outline}
                        value={evidenceNote}
                        onChangeText={setEvidenceNote}
                        multiline
                      />
                      <TouchableOpacity
                        style={styles.completeButton}
                        onPress={() => handleComplete(milestone.id)}
                        disabled={completingId === milestone.id}
                      >
                        {completingId === milestone.id ? (
                          <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                          <Text style={styles.completeButtonText}>Mark Complete</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}
          </View>
        ))}

        <TouchableOpacity
          style={styles.regenerateButton}
          onPress={() => router.push('./career-paths')}
        >
          <Text style={styles.regenerateButtonText}>Generate New Roadmap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    flexShrink: 1,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  progressBadge: {
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  progressValue: {
    ...typography.headlineSm,
    color: colors.onPrimary,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },
  semesterSection: {
    marginBottom: spacing.lg,
  },
  semesterTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  milestoneCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.tertiary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  milestoneCardCompleted: {
    borderLeftColor: colors.secondary,
    opacity: 0.9,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  milestoneMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  milestoneType: {
    ...typography.labelSm,
    color: colors.outline,
    textTransform: 'uppercase',
  },
  completedBadge: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completedBadgeText: {
    ...typography.labelSm,
    color: colors.onPrimary,
  },
  milestoneTitle: {
    ...typography.headlineSm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  milestoneDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  evidenceInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  completeButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  completeButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  regenerateButton: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  regenerateButtonText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  emptyTitle: {
    ...typography.headlineMd,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  createButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
});
