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
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { getCareerPaths, generateRoadmap } from '@/services/career';
import { type CareerPath } from '@/types/career';

const ACADEMIC_LEVELS = ['Level 100', 'Level 200', 'Level 300', 'Level 400'];

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
        currentSkills: skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Choose Your Career Path</Text>
        <Text style={styles.subtitle}>
          We&apos;ll build a semester-by-semester roadmap tailored to your goals.
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.sectionLabel}>Career Path</Text>
        {paths.map((path) => (
          <TouchableOpacity
            key={path.id}
            style={[styles.pathCard, selectedPath?.id === path.id && styles.pathCardSelected]}
            onPress={() => setSelectedPath(path)}
            activeOpacity={0.8}
          >
            <View style={styles.radioCircle}>
              {selectedPath?.id === path.id && <View style={styles.radioDot} />}
            </View>
            <View style={styles.pathInfo}>
              <Text style={styles.pathName}>{path.name}</Text>
              {path.description && <Text style={styles.pathDesc}>{path.description}</Text>}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionLabel}>Academic Level</Text>
        <View style={styles.levelRow}>
          {ACADEMIC_LEVELS.map((l) => (
            <TouchableOpacity
              key={l}
              style={[styles.levelChip, level === l && styles.levelChipSelected]}
              onPress={() => setLevel(l)}
            >
              <Text style={[styles.levelChipText, level === l && styles.levelChipTextSelected]}>
                {l}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Current Skills</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Python, HTML, CSS"
          placeholderTextColor={colors.outline}
          value={skills}
          onChangeText={setSkills}
        />
        <Text style={styles.inputHint}>Separate skills with commas.</Text>

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.generateButtonText}>Generate My Roadmap</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.viewRoadmapLink} onPress={() => router.push('./roadmap')}>
          <Text style={styles.viewRoadmapText}>I already have a roadmap →</Text>
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
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelMd,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pathCardSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.surfaceContainerLow,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.outline,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  pathInfo: {
    flex: 1,
  },
  pathName: {
    ...typography.headlineSm,
    color: colors.primary,
  },
  pathDesc: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  levelChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  levelChipSelected: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  levelChipText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  levelChipTextSelected: {
    color: colors.onPrimary,
  },
  input: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  inputHint: {
    ...typography.labelSm,
    color: colors.outline,
    marginTop: spacing.xs,
  },
  generateButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    ...typography.labelMd,
    color: colors.onPrimary,
    fontSize: 16,
  },
  viewRoadmapLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  viewRoadmapText: {
    ...typography.labelMd,
    color: colors.tertiary,
  },
});
