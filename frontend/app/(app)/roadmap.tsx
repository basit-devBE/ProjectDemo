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

const TYPE_CONFIG: Record<Milestone['type'], { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  SKILL:      { icon: 'book-outline',       color: colors.tertiary,  label: 'Skill' },
  PROJECT:    { icon: 'code-slash-outline',  color: colors.secondary, label: 'Project' },
  CERT:       { icon: 'trophy-outline',      color: '#F59E0B',        label: 'Cert' },
  EXPERIENCE: { icon: 'briefcase-outline',   color: colors.primary,   label: 'Experience' },
};

function StatusBadge({ completed, isNext }: { completed: boolean; isNext: boolean }) {
  if (completed) {
    return (
      <View style={[styles.statusBadge, styles.statusDone]}>
        <Ionicons name="checkmark-circle" size={11} color="#15803D" />
        <Text style={[styles.statusText, { color: '#15803D' }]}>Done</Text>
      </View>
    );
  }
  if (isNext) {
    return (
      <View style={[styles.statusBadge, styles.statusActive]}>
        <Ionicons name="ellipse" size={8} color={colors.tertiary} />
        <Text style={[styles.statusText, { color: colors.tertiary }]}>Up Next</Text>
      </View>
    );
  }
  return (
    <View style={[styles.statusBadge, styles.statusUpcoming]}>
      <Text style={[styles.statusText, { color: colors.outline }]}>Upcoming</Text>
    </View>
  );
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
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

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
      setError(err.status === 404 ? 'no-roadmap' : (err.message ?? 'Failed to load roadmap.'));
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
        evidenceNote: noteMap[milestoneId]?.trim() || undefined,
      });
      setNoteMap(prev => { const n = { ...prev }; delete n[milestoneId]; return n; });
      setRoadmap(prev =>
        prev
          ? {
              ...prev,
              progressPercent: updated.progressPercent,
              milestones: prev.milestones.map(m =>
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

  if (error === 'no-roadmap' || (!roadmap && error)) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="map-outline" size={48} color={colors.outline} />
        </View>
        <Text style={styles.emptyTitle}>No roadmap yet</Text>
        <Text style={styles.emptySubtitle}>Choose a career path and we'll build your personalised plan.</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('./career-paths')}>
          <Ionicons name="compass-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.createBtnText}>Choose Career Path</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!roadmap) return null;

  const grouped = groupBySemester(roadmap.milestones);
  const semesters = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  // Find the first incomplete milestone id (to mark as "Up Next")
  const firstIncompleteId = roadmap.milestones
    .slice()
    .sort((a, b) => a.semester - b.semester || a.order - b.order)
    .find(m => !m.completed)?.id;

  const doneCount = roadmap.milestones.filter(m => m.completed).length;
  const totalCount = roadmap.milestones.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{roadmap.careerPath}</Text>
          <Text style={styles.headerSub}>AI Career Roadmap</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Notifications">
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRoadmap(); }} tintColor={colors.secondary} />}
      >
        {/* Progress section */}
        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressCount}>{doneCount} / {totalCount} milestones</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressPercent}>{roadmap.progressPercent}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(roadmap.progressPercent, 100)}%` }]} />
          </View>
        </View>

        {/* Semesters */}
        {semesters.map(semester => {
          const semMilestones = grouped[semester].slice().sort((a, b) => a.order - b.order);
          const semDone = semMilestones.filter(m => m.completed).length;
          return (
            <View key={semester} style={styles.semesterSection}>
              <View style={styles.semesterHeader}>
                <View style={styles.semesterDot} />
                <Text style={styles.semesterTitle}>Semester {semester}</Text>
                <View style={styles.semesterCount}>
                  <Text style={styles.semesterCountText}>{semDone}/{semMilestones.length}</Text>
                </View>
              </View>

              <View style={styles.semesterCards}>
                {semMilestones.map((milestone, idx) => {
                  const cfg = TYPE_CONFIG[milestone.type] ?? TYPE_CONFIG.SKILL;
                  const isNext = milestone.id === firstIncompleteId;
                  const isLast = idx === semMilestones.length - 1;

                  return (
                    <View key={milestone.id} style={styles.milestoneRow}>
                      {/* Timeline */}
                      <View style={styles.timeline}>
                        <View style={[styles.timelineDot, milestone.completed && styles.timelineDotDone, isNext && styles.timelineDotActive]} />
                        {!isLast && <View style={[styles.timelineLine, milestone.completed && styles.timelineLineDone]} />}
                      </View>

                      {/* Card */}
                      <View style={[
                        styles.milestoneCard,
                        milestone.completed && styles.milestoneCardDone,
                        isNext && styles.milestoneCardActive,
                      ]}>
                        {/* Card header */}
                        <View style={styles.milestoneCardHeader}>
                          <View style={[styles.typeIconCircle, { backgroundColor: `${cfg.color}18` }]}>
                            <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                          </View>
                          <View style={styles.milestoneMetaRow}>
                            <View style={[styles.typeBadge, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}35` }]}>
                              <Text style={[styles.typeBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                            </View>
                            <StatusBadge completed={milestone.completed} isNext={isNext} />
                          </View>
                        </View>

                        <Text style={[styles.milestoneTitle, milestone.completed && styles.milestoneTitleDone]}>
                          {milestone.title}
                        </Text>
                        {milestone.description && (
                          <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                        )}

                        {!milestone.completed && (
                          <View style={styles.completionArea}>
                            <TextInput
                              style={styles.evidenceInput}
                              placeholder="Add evidence note (optional)"
                              placeholderTextColor={colors.outline}
                              value={noteMap[milestone.id] ?? ''}
                              onChangeText={text => setNoteMap(prev => ({ ...prev, [milestone.id]: text }))}
                              multiline
                            />
                            <TouchableOpacity
                              style={[styles.completeBtn, completingId === milestone.id && styles.completeBtnLoading]}
                              onPress={() => handleComplete(milestone.id)}
                              disabled={completingId === milestone.id}
                            >
                              {completingId === milestone.id ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.onPrimary} />
                                  <Text style={styles.completeBtnText}>Mark Complete</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}

                        {milestone.completed && (
                          <View style={styles.completedRow}>
                            <Ionicons name="checkmark-circle" size={16} color={colors.secondary} />
                            <Text style={styles.completedText}>Completed</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Regenerate */}
        <TouchableOpacity style={styles.regenBtn} onPress={() => router.push('./career-paths')}>
          <Ionicons name="refresh-outline" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.regenBtnText}>Generate New Roadmap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },

  /* Empty state */
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: { ...typography.headlineMd, color: colors.primary, marginBottom: spacing.sm },
  emptySubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.xl },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  createBtnText: { ...typography.labelMd, color: colors.onPrimary, fontSize: 15 },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.md,
  },
  headerTitle: { ...typography.headlineSm, color: colors.primary },
  headerSub: { ...typography.labelMd, color: colors.onSurfaceVariant, marginTop: 2 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 24 },

  /* Progress card */
  progressCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  progressLabel: { ...typography.labelSm, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, marginBottom: 4 },
  progressCount: { ...typography.headlineSm, color: colors.onPrimary },
  progressBadge: {
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  progressPercent: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.onPrimary },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
  },

  /* Semester */
  semesterSection: { marginBottom: spacing.lg },
  semesterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  semesterDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  semesterTitle: { ...typography.headlineSm, color: colors.primary, flex: 1 },
  semesterCount: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  semesterCountText: { ...typography.labelSm, color: colors.onSurfaceVariant },

  semesterCards: { paddingLeft: 2 },

  /* Milestone row (timeline + card) */
  milestoneRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },

  /* Timeline */
  timeline: { alignItems: 'center', width: 20, paddingTop: 14 },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.outlineVariant,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
  },
  timelineDotDone: { backgroundColor: colors.secondary },
  timelineDotActive: { backgroundColor: colors.tertiary },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.outlineVariant, marginTop: 4 },
  timelineLineDone: { backgroundColor: colors.secondary },

  /* Milestone card */
  milestoneCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  milestoneCardDone: {
    borderColor: '#A7F3D0',
    backgroundColor: '#FAFFFE',
  },
  milestoneCardActive: {
    borderColor: colors.tertiary,
    borderWidth: 1.5,
  },

  milestoneCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  milestoneMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  typeBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  typeBadgeText: { ...typography.labelSm, fontSize: 10 },

  /* Status badge */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  statusDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  statusActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  statusUpcoming: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
  statusText: { ...typography.labelSm, fontSize: 10 },

  milestoneTitle: { ...typography.headlineSm, color: colors.primary, fontSize: 15, marginBottom: spacing.xs },
  milestoneTitleDone: { color: colors.onSurfaceVariant },
  milestoneDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13, marginBottom: spacing.sm },

  /* Completion area */
  completionArea: { marginTop: spacing.sm, gap: spacing.sm },
  evidenceInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurface,
    minHeight: 56,
    textAlignVertical: 'top',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  completeBtnLoading: { opacity: 0.7 },
  completeBtnText: { ...typography.labelMd, color: colors.onPrimary },

  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  completedText: { ...typography.labelMd, color: colors.secondary },

  /* Regen button */
  regenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceCard,
  },
  regenBtnText: { ...typography.labelMd, color: colors.onSurfaceVariant },
});
