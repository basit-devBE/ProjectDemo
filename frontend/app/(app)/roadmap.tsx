import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
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
  SKILL:      { icon: 'book-outline',        color: colors.tertiary,          label: 'Skill' },
  PROJECT:    { icon: 'code-slash-outline',   color: colors.secondary,         label: 'Project' },
  CERT:       { icon: 'trophy-outline',       color: '#B45309',                label: 'Cert' },
  EXPERIENCE: { icon: 'briefcase-outline',    color: colors.onSurfaceVariant,  label: 'Exp' },
};

function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return anim;
}

function groupBySemester(milestones: Milestone[]) {
  return milestones.reduce<Record<number, Milestone[]>>((acc, m) => {
    if (!acc[m.semester]) acc[m.semester] = [];
    acc[m.semester].push(m);
    return acc;
  }, {});
}

// ─── Completed milestone (compact row) ─────────────────────────────────────
function CompletedRow({ milestone }: { milestone: Milestone }) {
  const cfg = TYPE_CONFIG[milestone.type] ?? TYPE_CONFIG.SKILL;
  return (
    <View style={styles.completedRow}>
      <View style={[styles.completedCheck, { backgroundColor: `${colors.secondary}18` }]}>
        <Ionicons name="checkmark" size={13} color={colors.secondary} />
      </View>
      <Text style={styles.completedTitle} numberOfLines={1}>{milestone.title}</Text>
      <View style={[styles.completedTypeBadge, { backgroundColor: `${cfg.color}12` }]}>
        <Text style={[styles.completedTypeText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
}

// ─── Up Next card (featured) ────────────────────────────────────────────────
function UpNextCard({
  milestone,
  onComplete,
  completing,
  noteValue,
  onNoteChange,
  pulseOpacity,
}: {
  milestone: Milestone;
  onComplete: () => void;
  completing: boolean;
  noteValue: string;
  onNoteChange: (v: string) => void;
  pulseOpacity: Animated.Value;
}) {
  const cfg = TYPE_CONFIG[milestone.type] ?? TYPE_CONFIG.SKILL;
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <View style={styles.upNextCard}>
      {/* Accent bar */}
      <View style={[styles.upNextAccent, { backgroundColor: colors.tertiary }]} />

      <View style={styles.upNextInner}>
        {/* Header */}
        <View style={styles.upNextHeader}>
          <View style={styles.upNextLiveRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulseOpacity }]} />
            <Text style={styles.upNextEyebrow}>UP NEXT</Text>
          </View>
          <View style={[styles.typePill, { backgroundColor: `${cfg.color}15`, borderColor: `${cfg.color}30` }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[styles.typePillText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.upNextTitle}>{milestone.title}</Text>

        {/* Description */}
        {milestone.description ? (
          <Text style={styles.upNextDesc}>{milestone.description}</Text>
        ) : null}

        {/* Evidence area (toggle) */}
        {evidenceOpen && (
          <TextInput
            style={styles.evidenceInput}
            placeholder="What did you do? Add a link, note, or screenshot description…"
            placeholderTextColor={colors.outline}
            value={noteValue}
            onChangeText={onNoteChange}
            multiline
            autoFocus
          />
        )}

        {/* Actions */}
        <View style={styles.upNextActions}>
          <TouchableOpacity
            style={styles.evidenceToggle}
            onPress={() => setEvidenceOpen(v => !v)}
          >
            <Ionicons
              name={evidenceOpen ? 'close-circle-outline' : 'attach-outline'}
              size={16}
              color={colors.onSurfaceVariant}
            />
            <Text style={styles.evidenceToggleText}>
              {evidenceOpen ? 'Remove note' : 'Add evidence'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.completeBtn, completing && styles.completeBtnLoading]}
            onPress={onComplete}
            disabled={completing}
          >
            {completing ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={17} color={colors.onPrimary} />
                <Text style={styles.completeBtnText}>Mark Complete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Upcoming card (standard, collapsible) ──────────────────────────────────
function UpcomingCard({
  milestone,
  onComplete,
  completing,
  noteValue,
  onNoteChange,
}: {
  milestone: Milestone;
  onComplete: () => void;
  completing: boolean;
  noteValue: string;
  onNoteChange: (v: string) => void;
}) {
  const cfg = TYPE_CONFIG[milestone.type] ?? TYPE_CONFIG.SKILL;
  const [expanded, setExpanded] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <TouchableOpacity
      style={styles.upcomingCard}
      onPress={() => setExpanded(v => !v)}
      activeOpacity={0.82}
    >
      {/* Collapsed header — always visible */}
      <View style={styles.upcomingHeader}>
        <View style={[styles.upcomingIconCircle, { backgroundColor: `${cfg.color}12` }]}>
          <Ionicons name={cfg.icon} size={16} color={cfg.color} />
        </View>
        <Text style={styles.upcomingTitle} numberOfLines={expanded ? undefined : 1}>
          {milestone.title}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.outline}
        />
      </View>

      {/* Expanded body */}
      {expanded && (
        <View style={styles.upcomingBody}>
          {milestone.description ? (
            <Text style={styles.upcomingDesc}>{milestone.description}</Text>
          ) : null}

          {evidenceOpen && (
            <TextInput
              style={styles.evidenceInput}
              placeholder="Add evidence note…"
              placeholderTextColor={colors.outline}
              value={noteValue}
              onChangeText={onNoteChange}
              multiline
            />
          )}

          <View style={styles.upcomingActions}>
            <TouchableOpacity
              style={styles.evidenceToggleSmall}
              onPress={e => { e.stopPropagation?.(); setEvidenceOpen(v => !v); }}
            >
              <Ionicons name="attach-outline" size={15} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.completeBtnOutlined, completing && { opacity: 0.6 }]}
              onPress={e => { e.stopPropagation?.(); onComplete(); }}
              disabled={completing}
            >
              {completing ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.secondary} />
                  <Text style={styles.completeBtnOutlinedText}>Mark Complete</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function RoadmapScreen() {
  const { state } = useAuth();
  const pulseOpacity = usePulse();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const tabScrollRef = useRef<ScrollView>(null);

  const loadRoadmap = useCallback(async () => {
    if (!state.accessToken || !state.user) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    try {
      const data = await getRoadmap(state.accessToken, state.user.id);
      setRoadmap(data);
      setError(null);
      const firstIncompleteSem = data.milestones
        .filter(m => !m.completed)
        .sort((a, b) => a.semester - b.semester)[0]?.semester;
      const sems = [...new Set(data.milestones.map(m => m.semester))].sort((a, b) => a - b);
      setSelectedSemester(firstIncompleteSem ?? sems[0] ?? 1);
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      setError(err.status === 404 ? 'no-roadmap' : (err.message ?? 'Failed to load roadmap.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [state.accessToken, state.user]);

  useEffect(() => { setLoading(true); loadRoadmap(); }, [loadRoadmap]);

  async function handleComplete(milestoneId: string) {
    if (!state.accessToken) return;
    setCompletingId(milestoneId);
    try {
      const updated = await completeMilestone(state.accessToken, milestoneId, {
        evidenceNote: noteMap[milestoneId]?.trim() || undefined,
      });
      setNoteMap(prev => { const n = { ...prev }; delete n[milestoneId]; return n; });
      setRoadmap(prev =>
        prev ? {
          ...prev,
          progressPercent: updated.progressPercent,
          milestones: prev.milestones.map(m => m.id === milestoneId ? { ...m, completed: true } : m),
        } : null
      );
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert('Error', err.message ?? 'Failed to complete milestone');
    } finally {
      setCompletingId(null);
    }
  }

  // ── Loading / empty states ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Building your roadmap…</Text>
      </SafeAreaView>
    );
  }

  if (error === 'no-roadmap' || (!roadmap && error)) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="map-outline" size={44} color={colors.outline} />
        </View>
        <Text style={styles.emptyTitle}>No roadmap yet</Text>
        <Text style={styles.emptySubtitle}>Choose a career path and we'll build your personalised plan.</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => router.push('./career-paths')}>
          <Ionicons name="compass-outline" size={17} color={colors.onPrimary} />
          <Text style={styles.createBtnText}>Choose Career Path</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!roadmap) return null;

  const grouped = groupBySemester(roadmap.milestones);
  const semesters = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const firstIncompleteId = roadmap.milestones
    .slice().sort((a, b) => a.semester - b.semester || a.order - b.order)
    .find(m => !m.completed)?.id;

  const doneCount = roadmap.milestones.filter(m => m.completed).length;
  const totalCount = roadmap.milestones.length;

  const currentMilestones = (grouped[selectedSemester] ?? [])
    .slice().sort((a, b) => a.order - b.order);
  const semDone = currentMilestones.filter(m => m.completed).length;
  const semTotal = currentMilestones.length;
  const semAllDone = semDone === semTotal;

  const currentIdx = semesters.indexOf(selectedSemester);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{roadmap.careerPath}</Text>
          <Text style={styles.headerSub}>AI Career Roadmap</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('./career-paths')}
          accessibilityLabel="Generate new roadmap"
        >
          <Ionicons name="refresh-outline" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ── Progress strip ── */}
      <View style={styles.progressStrip}>
        <View style={styles.progressStripRow}>
          <Text style={styles.progressStripLabel}>
            {doneCount} of {totalCount} milestones complete
          </Text>
          <Text style={styles.progressStripPct}>{roadmap.progressPercent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(roadmap.progressPercent, 100)}%` }]} />
        </View>
      </View>

      {/* ── Semester tabs ── */}
      <View style={styles.tabBarWrap}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {semesters.map(sem => {
            const semMs = grouped[sem] ?? [];
            const semDoneCount = semMs.filter(m => m.completed).length;
            const allDone = semDoneCount === semMs.length;
            const hasNext = semMs.some(m => m.id === firstIncompleteId);
            const isSelected = sem === selectedSemester;

            return (
              <TouchableOpacity
                key={sem}
                style={[styles.tab, isSelected && styles.tabSelected, allDone && !isSelected && styles.tabDone]}
                onPress={() => setSelectedSemester(sem)}
                activeOpacity={0.75}
              >
                {allDone
                  ? <Ionicons name="checkmark-circle" size={12} color={isSelected ? colors.onPrimary : colors.secondary} />
                  : hasNext && !isSelected
                    ? <View style={styles.tabActiveDot} />
                    : null
                }
                <Text style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                  allDone && !isSelected && styles.tabTextDone,
                ]}>S{sem}</Text>
                <Text style={[styles.tabCount, isSelected && styles.tabCountSelected]}>
                  {semDoneCount}/{semMs.length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Semester content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadRoadmap(); }}
            tintColor={colors.secondary}
          />
        }
      >
        {/* Semester heading */}
        <View style={styles.semHeading}>
          <Text style={styles.semTitle}>Semester {selectedSemester}</Text>
          <View style={[styles.semPill, semAllDone && styles.semPillDone]}>
            {semAllDone
              ? <Ionicons name="checkmark-circle" size={13} color={colors.secondary} />
              : null}
            <Text style={[styles.semPillText, semAllDone && styles.semPillTextDone]}>
              {semAllDone ? 'Complete' : `${semDone}/${semTotal} done`}
            </Text>
          </View>
        </View>

        {/* Step counter dots */}
        <View style={styles.stepDots}>
          {currentMilestones.map((m, i) => (
            <View
              key={m.id}
              style={[
                styles.stepDot,
                m.completed && styles.stepDotDone,
                m.id === firstIncompleteId && styles.stepDotActive,
              ]}
            />
          ))}
        </View>

        {/* Milestone list — three modes */}
        <View style={styles.milestoneList}>
          {currentMilestones.map(milestone => {
            if (milestone.completed) {
              return <CompletedRow key={milestone.id} milestone={milestone} />;
            }
            if (milestone.id === firstIncompleteId) {
              return (
                <UpNextCard
                  key={milestone.id}
                  milestone={milestone}
                  onComplete={() => handleComplete(milestone.id)}
                  completing={completingId === milestone.id}
                  noteValue={noteMap[milestone.id] ?? ''}
                  onNoteChange={text => setNoteMap(prev => ({ ...prev, [milestone.id]: text }))}
                  pulseOpacity={pulseOpacity}
                />
              );
            }
            return (
              <UpcomingCard
                key={milestone.id}
                milestone={milestone}
                onComplete={() => handleComplete(milestone.id)}
                completing={completingId === milestone.id}
                noteValue={noteMap[milestone.id] ?? ''}
                onNoteChange={text => setNoteMap(prev => ({ ...prev, [milestone.id]: text }))}
              />
            );
          })}
        </View>

        {/* Semester navigation */}
        <View style={styles.semNav}>
          <TouchableOpacity
            style={[styles.navBtn, currentIdx === 0 && styles.navBtnDisabled]}
            onPress={() => currentIdx > 0 && setSelectedSemester(semesters[currentIdx - 1])}
            disabled={currentIdx === 0}
          >
            <Ionicons name="chevron-back" size={17} color={currentIdx === 0 ? colors.outline : colors.primary} />
            <Text style={[styles.navBtnText, currentIdx === 0 && styles.navBtnTextDisabled]}>Prev</Text>
          </TouchableOpacity>

          <Text style={styles.navPageText}>{currentIdx + 1} / {semesters.length}</Text>

          <TouchableOpacity
            style={[styles.navBtn, currentIdx === semesters.length - 1 && styles.navBtnDisabled]}
            onPress={() => currentIdx < semesters.length - 1 && setSelectedSemester(semesters[currentIdx + 1])}
            disabled={currentIdx === semesters.length - 1}
          >
            <Text style={[styles.navBtnText, currentIdx === semesters.length - 1 && styles.navBtnTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={17} color={currentIdx === semesters.length - 1 ? colors.outline : colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface, padding: spacing.xl, gap: spacing.sm,
  },
  loadingText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: spacing.sm },

  emptyIconWrap: {
    width: 88, height: 88, borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  emptyTitle: { ...typography.headlineSm, color: colors.primary },
  emptySubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, textAlign: 'center', marginBottom: spacing.lg },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.secondary, borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  createBtnText: { ...typography.labelMd, color: colors.onPrimary },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: colors.primary },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 1 },
  headerBtn: {
    width: 38, height: 38, borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },

  /* Progress strip */
  progressStrip: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.md,
  },
  progressStripRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressStripLabel: { ...typography.labelSm, color: 'rgba(255,255,255,0.6)' },
  progressStripPct: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: colors.onPrimary },
  progressTrack: {
    height: 5, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: radius.full },

  /* Tab bar */
  tabBarWrap: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: spacing.xs, flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  tabActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.tertiary },
  tabText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 12 },
  tabTextSelected: { color: colors.onPrimary },
  tabTextDone: { color: colors.secondary },
  tabCount: { ...typography.labelSm, color: colors.outline, fontSize: 10 },
  tabCountSelected: { color: 'rgba(255,255,255,0.6)' },

  /* Semester heading */
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 24 },
  semHeading: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  semTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: colors.primary },
  semPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  semPillDone: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  semPillText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11 },
  semPillTextDone: { color: colors.secondary },

  /* Step progress dots */
  stepDots: {
    flexDirection: 'row', gap: 6, marginBottom: spacing.lg,
  },
  stepDot: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: colors.outlineVariant,
  },
  stepDotDone: { backgroundColor: colors.secondary },
  stepDotActive: { backgroundColor: colors.tertiary },

  /* Milestone list container */
  milestoneList: { gap: spacing.sm },

  /* ─ Completed row ─ */
  completedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  completedCheck: {
    width: 26, height: 26, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  completedTitle: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  completedTypeBadge: {
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0,
  },
  completedTypeText: { ...typography.labelSm, fontSize: 10 },

  /* ─ Up Next card ─ */
  upNextCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: `${colors.tertiary}35`,
    overflow: 'hidden',
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  upNextAccent: { width: 4, flexShrink: 0 },
  upNextInner: { flex: 1, padding: spacing.md },
  upNextHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  upNextLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.tertiary,
  },
  upNextEyebrow: {
    ...typography.labelSm, color: colors.tertiary,
    fontSize: 10, letterSpacing: 0.8,
  },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1,
  },
  typePillText: { ...typography.labelSm, fontSize: 10 },
  upNextTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17, lineHeight: 23,
    color: colors.primary, marginBottom: spacing.xs,
  },
  upNextDesc: {
    ...typography.bodyMd, fontSize: 13, lineHeight: 19,
    color: colors.onSurfaceVariant, marginBottom: spacing.md,
  },
  evidenceInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    fontFamily: 'Inter_400Regular', fontSize: 13,
    color: colors.onSurface,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  upNextActions: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: spacing.sm,
    marginTop: spacing.xs,
  },
  evidenceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 6, paddingHorizontal: spacing.sm,
  },
  evidenceToggleText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 12 },
  completeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    flex: 1, justifyContent: 'center',
  },
  completeBtnLoading: { opacity: 0.65 },
  completeBtnText: { ...typography.labelMd, color: colors.onPrimary },

  /* ─ Upcoming card ─ */
  upcomingCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  upcomingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 13, paddingHorizontal: spacing.md,
  },
  upcomingIconCircle: {
    width: 30, height: 30, borderRadius: radius.full,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  upcomingTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium', fontSize: 14,
    color: colors.onSurface, lineHeight: 20,
  },
  upcomingBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  upcomingDesc: {
    ...typography.bodyMd, fontSize: 13, lineHeight: 19,
    color: colors.onSurfaceVariant,
  },
  upcomingActions: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.xs,
  },
  evidenceToggleSmall: {
    width: 34, height: 34, borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  completeBtnOutlined: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.secondary,
    borderRadius: radius.md, paddingVertical: 9,
  },
  completeBtnOutlinedText: { ...typography.labelMd, color: colors.secondary },

  /* Semester navigation */
  semNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: radius.md, backgroundColor: colors.surfaceCard,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  navBtnDisabled: { opacity: 0.35 },
  navBtnText: { ...typography.labelMd, color: colors.primary, fontSize: 13 },
  navBtnTextDisabled: { color: colors.outline },
  navPageText: { ...typography.labelSm, color: colors.onSurfaceVariant },
});
