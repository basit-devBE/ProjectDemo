import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { getCareerPaths, generateRoadmap } from '@/services/career';
import { type CareerPath } from '@/types/career';

const ACADEMIC_LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];

interface PathMeta {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  demand: string;
  demandColor: string;
}

const PATH_META: Record<string, PathMeta> = {
  'Software Engineer':    { icon: 'code-slash-outline',  color: colors.tertiary,  demand: 'High Demand',      demandColor: colors.secondary },
  'Data Analyst':         { icon: 'bar-chart-outline',   color: '#F59E0B',         demand: 'Fastest Growing',  demandColor: '#D97706' },
  'Accountant':           { icon: 'calculator-outline',  color: colors.primary,   demand: 'Evergreen',        demandColor: colors.primary },
  'Electrical Engineer':  { icon: 'flash-outline',       color: '#EF4444',         demand: 'High Demand',      demandColor: colors.secondary },
  'Civil Engineer':       { icon: 'construct-outline',   color: '#8B5CF6',         demand: 'Stable',           demandColor: '#7C3AED' },
};

function getPathMeta(name: string): PathMeta {
  return PATH_META[name] ?? { icon: 'briefcase-outline', color: colors.secondary, demand: 'In Demand', demandColor: colors.secondary };
}

export default function CareerPathsScreen() {
  const { state } = useAuth();
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<CareerPath | null>(null);
  const [level, setLevel] = useState('Level 200');
  const [skills, setSkills] = useState('');
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
      Alert.alert('Select a career path', 'Please choose a career path first.');
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
        currentSkills: skills.split(',').map(s => s.trim()).filter(Boolean),
      });
      router.replace('./roadmap');
    } catch (e: unknown) {
      const err = e as { message?: string };
      Alert.alert('Error', err.message ?? 'Failed to generate roadmap');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.fetchingText}>Loading career paths…</Text>
      </SafeAreaView>
    );
  }

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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Text style={styles.title}>Choose Your{'\n'}Career Path</Text>
        <Text style={styles.subtitle}>
          We'll build a semester-by-semester roadmap tailored to your goals.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Career paths */}
        <Text style={styles.sectionLabel}>
          <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
          {'  '}Career Path
        </Text>

        {paths.map(path => {
          const meta = getPathMeta(path.name);
          const isSelected = selectedPath?.id === path.id;
          return (
            <TouchableOpacity
              key={path.id}
              style={[styles.pathCard, isSelected && styles.pathCardSelected, { borderLeftColor: meta.color }]}
              onPress={() => setSelectedPath(path)}
              activeOpacity={0.78}
            >
              <View style={[styles.pathIconCircle, { backgroundColor: `${meta.color}15` }]}>
                <Ionicons name={meta.icon} size={22} color={meta.color} />
              </View>
              <View style={styles.pathInfo}>
                <View style={styles.pathTitleRow}>
                  <Text style={[styles.pathName, isSelected && { color: meta.color }]}>{path.name}</Text>
                  <View style={[styles.demandBadge, { backgroundColor: `${meta.demandColor}15`, borderColor: `${meta.demandColor}35` }]}>
                    <Text style={[styles.demandText, { color: meta.demandColor }]}>{meta.demand}</Text>
                  </View>
                </View>
                {path.description && (
                  <Text style={styles.pathDesc} numberOfLines={2}>{path.description}</Text>
                )}
              </View>
              <View style={[styles.radioCircle, isSelected && { borderColor: meta.color }]}>
                {isSelected && <View style={[styles.radioDot, { backgroundColor: meta.color }]} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Academic level */}
        <Text style={styles.sectionLabel}>
          <Ionicons name="school-outline" size={14} color={colors.primary} />
          {'  '}Academic Level
        </Text>
        <View style={styles.levelRow}>
          {ACADEMIC_LEVELS.map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.levelChip, level === l && styles.levelChipSelected]}
              onPress={() => setLevel(l)}
            >
              <Text style={[styles.levelChipText, level === l && styles.levelChipTextSelected]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Skills */}
        <Text style={styles.sectionLabel}>
          <Ionicons name="flash-outline" size={14} color={colors.primary} />
          {'  '}Current Skills
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="code-slash-outline" size={18} color={colors.outline} />
          <TextInput
            style={styles.input}
            placeholder="e.g. Python, HTML, Excel, AutoCAD"
            placeholderTextColor={colors.outline}
            value={skills}
            onChangeText={setSkills}
          />
        </View>
        <Text style={styles.inputHint}>Separate skills with commas — the AI uses these to personalise your roadmap.</Text>

        {/* Generate */}
        <TouchableOpacity
          style={[styles.generateBtn, (!selectedPath || loading) && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={!selectedPath || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="sparkles-outline" size={18} color={colors.onPrimary} />
              <Text style={styles.generateBtnText}>Generate My Roadmap</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.viewLink} onPress={() => router.push('./roadmap')}>
          <Text style={styles.viewLinkText}>I already have a roadmap →</Text>
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
    gap: spacing.md,
  },
  fetchingText: { ...typography.bodyMd, color: colors.onSurfaceVariant },

  header: {
    flexDirection: 'row',
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

  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl + 24 },

  title: { ...typography.headlineLg, color: colors.primary, marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: spacing.lg },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorContainer,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: { ...typography.labelMd, color: colors.error, flex: 1 },

  sectionLabel: {
    ...typography.labelMd,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  /* Path cards */
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderLeftWidth: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: spacing.md,
  },
  pathCardSelected: {
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  pathIconCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  pathInfo: { flex: 1, gap: 4 },
  pathTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  pathName: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: colors.primary },
  demandBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  demandText: { ...typography.labelSm, fontSize: 10 },
  pathDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontSize: 13 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  radioDot: { width: 10, height: 10, borderRadius: radius.full },

  /* Level chips */
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  levelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  levelChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelChipText: { ...typography.labelMd, color: colors.onSurface },
  levelChipTextSelected: { color: colors.onPrimary },

  /* Input */
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface, paddingVertical: 6 },
  inputHint: { ...typography.labelSm, color: colors.outline, marginTop: spacing.xs, marginBottom: spacing.sm },

  /* Generate button */
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { ...typography.labelMd, color: colors.onPrimary, fontSize: 16 },

  viewLink: { marginTop: spacing.lg, alignItems: 'center' },
  viewLinkText: { ...typography.labelMd, color: colors.tertiary },
});
