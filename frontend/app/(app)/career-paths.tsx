import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { getCareerPaths, generateRoadmap } from '@/services/career';
import { type CareerPath } from '@/types/career';

// ─── Config ──────────────────────────────────────────────────────────────────

interface PathMeta {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  demand: string;
}

const PATH_META: Record<string, PathMeta> = {
  'Software Engineer':   { icon: 'code-slash-outline',  color: colors.tertiary,         demand: 'High Demand' },
  'Data Analyst':        { icon: 'bar-chart-outline',   color: colors.secondary,        demand: 'Fastest Growing' },
  'Accountant':          { icon: 'calculator-outline',  color: colors.onSurfaceVariant, demand: 'Evergreen' },
  'Electrical Engineer': { icon: 'flash-outline',       color: colors.tertiary,         demand: 'High Demand' },
  'Civil Engineer':      { icon: 'construct-outline',   color: colors.onSurfaceVariant, demand: 'Stable' },
};

function getPathMeta(name: string): PathMeta {
  return PATH_META[name] ?? { icon: 'briefcase-outline', color: colors.secondary, demand: 'In Demand' };
}

const LEVELS = [
  { value: 'Level 100', year: 'Year 1', label: '100' },
  { value: 'Level 200', year: 'Year 2', label: '200' },
  { value: 'Level 300', year: 'Year 3', label: '300' },
  { value: 'Level 400', year: 'Year 4', label: '400' },
];

// ─── Generating overlay ───────────────────────────────────────────────────────

const GENERATING_STEPS = [
  'Analysing your career path…',
  'Mapping KNUST semester structure…',
  'Generating milestones with Claude AI…',
  'Personalising to your skills…',
  'Finalising your roadmap…',
];

function GeneratingOverlay({ careerPath }: { careerPath: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cycle through steps every ~18s spread over ~90s total
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStepIdx(i => Math.min(i + 1, GENERATING_STEPS.length - 1));
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 18000);

    // Continuous dot pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, [fadeAnim, dotAnim]);

  return (
    <SafeAreaView style={styles.generatingContainer}>
      {/* Animated rings */}
      <View style={styles.generatingVisual}>
        <View style={styles.ring3}>
          <View style={styles.ring2}>
            <View style={styles.ring1}>
              <View style={styles.ringCore}>
                <Ionicons name="sparkles" size={32} color={colors.onPrimary} />
              </View>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.generatingTitle}>Building your roadmap</Text>
      <Text style={styles.generatingPath}>{careerPath}</Text>

      <Animated.Text style={[styles.generatingStep, { opacity: fadeAnim }]}>
        {GENERATING_STEPS[stepIdx]}
      </Animated.Text>

      <Text style={styles.generatingNote}>
        Claude AI is crafting a full semester-by-semester plan.{'\n'}This takes around 30–60 seconds.
      </Text>

      <View style={styles.generatingDots}>
        {[0, 1, 2].map(i => (
          <Animated.View
            key={i}
            style={[
              styles.generatingDot,
              {
                opacity: dotAnim.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: i === 0 ? [0.3, 1, 0.3, 0.3] : i === 1 ? [0.3, 0.3, 1, 0.3] : [0.3, 0.3, 0.3, 1],
                }),
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Skill tag input ──────────────────────────────────────────────────────────

function SkillTags({
  skills,
  onChange,
}: {
  skills: string[];
  onChange: (s: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);

  function commitDraft(raw: string) {
    const trimmed = raw.trim().replace(/,+$/, '').trim();
    if (trimmed && !skills.includes(trimmed)) {
      onChange([...skills, trimmed]);
    }
    setDraft('');
  }

  function handleChangeText(text: string) {
    if (text.endsWith(',')) {
      commitDraft(text.slice(0, -1));
    } else {
      setDraft(text);
    }
  }

  function removeSkill(s: string) {
    onChange(skills.filter(x => x !== s));
  }

  return (
    <TouchableOpacity
      style={styles.tagContainer}
      onPress={() => inputRef.current?.focus()}
      activeOpacity={1}
    >
      {skills.map(s => (
        <View key={s} style={styles.tag}>
          <Text style={styles.tagText}>{s}</Text>
          <TouchableOpacity onPress={() => removeSkill(s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons name="close" size={13} color={colors.tertiary} />
          </TouchableOpacity>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        style={styles.tagInput}
        value={draft}
        onChangeText={handleChangeText}
        onSubmitEditing={() => commitDraft(draft)}
        onBlur={() => commitDraft(draft)}
        placeholder={skills.length === 0 ? 'e.g. Python, Excel, AutoCAD…' : 'Add more…'}
        placeholderTextColor={colors.outline}
        returnKeyType="done"
        blurOnSubmit={false}
      />
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CareerPathsScreen() {
  const { state } = useAuth();
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [level, setLevel] = useState('Level 200');
  const [skills, setSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCareerPaths()
      .then(setPaths)
      .catch(() => setError('Could not load career paths. Is the backend running?'))
      .finally(() => setFetching(false));
  }, []);

  async function handleGenerate() {
    if (!selectedPath) {
      Alert.alert('Choose a path', 'Please select a career path first.');
      return;
    }
    if (!state.accessToken) {
      Alert.alert('Not authenticated', 'Please log in again.');
      return;
    }
    setLoading(true);
    try {
      await generateRoadmap(state.accessToken, {
        careerPath: selectedPath.name,
        academicLevel: level,
        currentSkills: skills,
      });
      router.replace('./roadmap');
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert('Error', err.message ?? 'Failed to generate roadmap');
      setLoading(false);
    }
  }

  // Generating — full screen takeover
  if (loading) {
    return <GeneratingOverlay careerPath={selectedPath?.name ?? 'your career path'} />;
  }

  if (fetching) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.fetchingText}>Loading career paths…</Text>
      </SafeAreaView>
    );
  }

  // Split paths into rows of 2
  const pathRows: CareerPath[][] = [];
  for (let i = 0; i < paths.length; i += 2) {
    pathRows.push(paths.slice(i, i + 2));
  }

  const canGenerate = !!selectedPath;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMark}>
            <Ionicons name="compass" size={16} color={colors.onPrimary} />
          </View>
          <Text style={styles.headerTitle}>Career Paths</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('./roadmap')} style={styles.headerLink}>
          <Text style={styles.headerLinkText}>My Roadmap</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.tertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Build your{'\n'}career roadmap</Text>
          <Text style={styles.heroSubtitle}>
            AI-powered, semester-by-semester — tailored to you at KNUST.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Step 1: Career Path ── */}
        <View style={styles.stepHeader}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepTitle}>Choose your career path</Text>
        </View>

        <View style={styles.pathGrid}>
          {pathRows.map((row, ri) => (
            <View key={ri} style={styles.pathRow}>
              {row.map(path => {
                const meta = getPathMeta(path.name);
                const isSelected = selectedPath?.id === path.id;
                return (
                  <TouchableOpacity
                    key={path.id}
                    style={[
                      styles.pathCard,
                      isSelected && { backgroundColor: meta.color, borderColor: meta.color },
                    ]}
                    onPress={() => setSelectedPath(isSelected ? null : path)}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.pathIconWrap,
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : `${meta.color}15` },
                    ]}>
                      <Ionicons
                        name={meta.icon}
                        size={26}
                        color={isSelected ? colors.onPrimary : meta.color}
                      />
                    </View>
                    <Text
                      style={[styles.pathName, isSelected && styles.pathNameSelected]}
                      numberOfLines={2}
                    >
                      {path.name}
                    </Text>
                    <View style={[
                      styles.demandPill,
                      isSelected
                        ? { backgroundColor: 'rgba(255,255,255,0.2)' }
                        : { backgroundColor: `${meta.color}12` },
                    ]}>
                      <Text style={[
                        styles.demandText,
                        { color: isSelected ? colors.onPrimary : meta.color },
                      ]}>
                        {meta.demand}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.pathCheckmark}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.onPrimary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {/* Pad odd rows */}
              {row.length === 1 && <View style={styles.pathCardPlaceholder} />}
            </View>
          ))}
        </View>

        {/* ── Step 2: Academic Level ── */}
        <View style={styles.stepHeader}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={styles.stepTitle}>Your academic level</Text>
        </View>

        <View style={styles.levelTrack}>
          {LEVELS.map((l, idx) => {
            const isSelected = level === l.value;
            const isPast = LEVELS.findIndex(x => x.value === level) > idx;
            return (
              <View key={l.value} style={styles.levelStep}>
                {/* Connector line */}
                {idx < LEVELS.length - 1 && (
                  <View style={[
                    styles.levelConnector,
                    (isSelected || isPast) && styles.levelConnectorActive,
                  ]} />
                )}
                <TouchableOpacity
                  style={[
                    styles.levelNode,
                    isSelected && styles.levelNodeSelected,
                    isPast && styles.levelNodePast,
                  ]}
                  onPress={() => setLevel(l.value)}
                >
                  {isPast
                    ? <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
                    : <Text style={[styles.levelNodeText, isSelected && styles.levelNodeTextSelected]}>
                        {l.label}
                      </Text>
                  }
                </TouchableOpacity>
                <Text style={[styles.levelYear, isSelected && styles.levelYearSelected]}>
                  {l.year}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.levelContextCard, { borderColor: colors.outlineVariant }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.onSurfaceVariant} />
          <Text style={styles.levelContextText}>
            We'll generate milestones from{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Inter_500Medium' }}>
              {LEVELS.find(l2 => l2.value === level)?.year ?? level}
            </Text>
            {' '}onwards — skipping semesters you've already completed.
          </Text>
        </View>

        {/* ── Step 3: Skills ── */}
        <View style={styles.stepHeader}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <Text style={styles.stepTitle}>Your current skills</Text>
        </View>

        <SkillTags skills={skills} onChange={setSkills} />
        <Text style={styles.inputHint}>
          Type a skill and press comma or return to add it. The AI uses these to personalise your milestones.
        </Text>

        {/* ── Generate ── */}
        <TouchableOpacity
          style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={!canGenerate}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={19} color={colors.onPrimary} />
          <View>
            <Text style={styles.generateBtnText}>Generate My Roadmap</Text>
            {selectedPath && (
              <Text style={styles.generateBtnSub}>{selectedPath.name} · {level}</Text>
            )}
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {!canGenerate && (
          <Text style={styles.generateHint}>Select a career path above to continue</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surface, gap: spacing.sm,
  },
  fetchingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  /* Generating overlay */
  generatingContainer: {
    flex: 1, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    padding: spacing.xl,
  },
  generatingVisual: { marginBottom: spacing.xl },
  ring3: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  ring2: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center', alignItems: 'center',
  },
  ring1: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  ringCore: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.secondary,
    justifyContent: 'center', alignItems: 'center',
  },
  generatingTitle: {
    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26,
    color: colors.onPrimary, textAlign: 'center', marginBottom: spacing.xs,
  },
  generatingPath: {
    fontFamily: 'Inter_500Medium', fontSize: 15,
    color: colors.secondary, textAlign: 'center',
    marginBottom: spacing.xl,
  },
  generatingStep: {
    ...typography.labelMd, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', marginBottom: spacing.lg,
  },
  generatingNote: {
    ...typography.bodyMd, fontSize: 13, lineHeight: 20,
    color: 'rgba(255,255,255,0.4)', textAlign: 'center',
    marginBottom: spacing.xl,
  },
  generatingDots: { flexDirection: 'row', gap: spacing.sm },
  generatingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.secondary,
  },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoMark: {
    width: 30, height: 30, borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, color: colors.primary },
  headerLink: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  headerLinkText: { ...typography.labelMd, color: colors.tertiary },

  /* Hero */
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 24 },
  hero: { marginBottom: spacing.xl },
  heroTitle: {
    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 30, lineHeight: 38,
    color: colors.primary, marginBottom: spacing.sm,
  },
  heroSubtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, lineHeight: 22 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md, padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.labelMd, color: colors.error, flex: 1 },

  /* Step headers */
  stepHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  stepNumText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, color: colors.onPrimary },
  stepTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: colors.primary },

  /* Path grid */
  pathGrid: { gap: spacing.sm },
  pathRow: { flexDirection: 'row', gap: spacing.sm },
  pathCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
    position: 'relative',
    minHeight: 150,
  },
  pathCardPlaceholder: { flex: 1 },
  pathIconWrap: {
    width: 50, height: 50, borderRadius: radius.lg,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'flex-start',
  },
  pathName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15, lineHeight: 20, color: colors.primary,
    flex: 1,
  },
  pathNameSelected: { color: colors.onPrimary },
  demandPill: {
    borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  demandText: { ...typography.labelSm, fontSize: 10 },
  pathCheckmark: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
  },

  /* Level track */
  levelTrack: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  levelStep: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  levelConnector: {
    position: 'absolute',
    top: 16,
    left: '50%',
    right: '-50%',
    height: 2,
    backgroundColor: colors.outlineVariant,
    zIndex: 0,
  },
  levelConnectorActive: { backgroundColor: colors.secondary },
  levelNode: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 2, borderColor: colors.outlineVariant,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 1,
  },
  levelNodeSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelNodePast: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  levelNodeText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, color: colors.onSurfaceVariant },
  levelNodeTextSelected: { color: colors.onPrimary },
  levelYear: {
    ...typography.labelSm, fontSize: 11,
    color: colors.onSurfaceVariant, marginTop: spacing.xs,
    textAlign: 'center',
  },
  levelYearSelected: { color: colors.primary, fontFamily: 'Inter_600SemiBold' },

  levelContextCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  levelContextText: {
    ...typography.labelSm, color: colors.onSurfaceVariant,
    flex: 1, lineHeight: 18, fontFamily: 'Inter_400Regular',
  },

  /* Skill tags */
  tagContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.outlineVariant,
    padding: spacing.md,
    minHeight: 54,
  },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: `${colors.tertiary}12`,
    borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: `${colors.tertiary}30`,
  },
  tagText: { ...typography.labelSm, color: colors.tertiary, fontSize: 12 },
  tagInput: {
    ...typography.bodyMd, color: colors.onSurface,
    fontSize: 14, minWidth: 120,
    paddingVertical: 2,
  },
  inputHint: {
    ...typography.labelSm, color: colors.outline,
    marginTop: spacing.xs, lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },

  /* Generate button */
  generateBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  generateBtnDisabled: { opacity: 0.45 },
  generateBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17, color: colors.onPrimary,
  },
  generateBtnSub: {
    ...typography.labelSm, color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  generateHint: {
    ...typography.labelSm, color: colors.outline,
    textAlign: 'center', marginTop: spacing.md,
    fontFamily: 'Inter_400Regular',
  },
});
