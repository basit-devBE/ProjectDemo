import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerAsset } from 'expo-document-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';
import { analyseCV, getReports, deleteReport } from '@/services/skillGap';
import { type GapReport } from '@/types/skillGap';

function usePulse() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return anim;
}

function ReportRow({
  report,
  onPress,
  onDelete,
  isDeleting,
}: {
  report: GapReport;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const dateStr = report.createdAt
    ? new Date(report.createdAt).toLocaleDateString()
    : '';

  return (
    <TouchableOpacity style={styles.reportRow} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.reportRowIcon}>
        <Ionicons name="document-text-outline" size={18} color={colors.secondary} />
      </View>
      <View style={styles.reportRowBody}>
        <Text style={styles.reportRowTitle} numberOfLines={1}>{report.targetRole}</Text>
        <Text style={styles.reportRowMeta}>
          {report.gaps.length} {report.gaps.length === 1 ? 'gap' : 'gaps'}
          {dateStr ? `  ·  ${dateStr}` : ''}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        disabled={isDeleting}
        style={styles.deleteBtn}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="trash-outline"
          size={16}
          color={isDeleting ? colors.outline : colors.error}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SkillGapScreen() {
  const { state } = useAuth();
  const token = state.accessToken;
  const pulseOpacity = usePulse();

  // Upload section state
  const [pickedFile, setPickedFile] = useState<DocumentPickerAsset | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);

  // History section state
  const [reports, setReports] = useState<GapReport[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReports = useCallback(async (refreshing = false) => {
    if (!token) return;
    refreshing ? setIsRefreshing(true) : setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const data = await getReports(token);
      setReports(data);
    } catch (e: any) {
      setHistoryError(e.message ?? 'Failed to load history');
    } finally {
      setIsLoadingHistory(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useFocusEffect(useCallback(() => { loadReports(); }, [loadReports]));

  const handleDelete = useCallback((report: GapReport) => {
    Alert.alert(
      'Delete Analysis',
      `This will permanently remove the gap analysis for "${report.targetRole}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            setDeletingId(report.reportId);
            setReports(prev => prev.filter(r => r.reportId !== report.reportId));
            try {
              await deleteReport(token, report.reportId);
            } catch (e: any) {
              setReports(prev => {
                const restored = [...prev, report];
                restored.sort((a, b) =>
                  (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
                return restored;
              });
              setHistoryError(e.message ?? 'Failed to delete report');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, [token]);

  const handleBrowse = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setPickedFile(result.assets[0]);
        setAnalyseError(null);
      }
    } catch {
      setAnalyseError('Could not open file picker. Check storage permissions.');
    }
  };

  const handleAnalyse = async () => {
    if (!token || !pickedFile || !targetRole.trim()) return;
    setIsAnalysing(true);
    setAnalyseError(null);
    try {
      const report = await analyseCV(token, pickedFile, targetRole.trim());
      setPickedFile(null);
      setTargetRole('');
      router.push(`/gap-report/${report.reportId}`);
    } catch (e: any) {
      setAnalyseError(e.message ?? 'Analysis failed. Please try again.');
    } finally {
      setIsAnalysing(false);
    }
  };

  const canAnalyse = !!pickedFile && targetRole.trim().length > 0 && !isAnalysing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skills</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadReports(true)}
            tintColor={colors.secondary}
          />
        }
      >
        {/* ── Upload section ── */}
        {isAnalysing ? (
          <Animated.View style={[styles.analysingCard, { opacity: pulseOpacity }]}>
            <Ionicons name="sparkles-outline" size={28} color={colors.secondary} />
            <Text style={styles.analysingTitle}>Analysing your CV…</Text>
            <Text style={styles.analysingSubtitle}>This may take 15–30 seconds</Text>
          </Animated.View>
        ) : (
          <View style={styles.uploadSection}>
            <Text style={styles.sectionLabel}>Upload CV</Text>

            {/* File picker card */}
            <TouchableOpacity style={styles.fileCard} onPress={handleBrowse} activeOpacity={0.8}>
              <View style={styles.fileCardIcon}>
                <Ionicons
                  name={pickedFile ? 'document-text' : 'document-text-outline'}
                  size={24}
                  color={pickedFile ? colors.secondary : colors.outline}
                />
              </View>
              <View style={styles.fileCardBody}>
                <Text
                  style={[styles.fileCardText, pickedFile && styles.fileCardTextPicked]}
                  numberOfLines={1}
                >
                  {pickedFile ? pickedFile.name : 'No file selected'}
                </Text>
                <Text style={styles.fileCardHint}>PDF or DOCX, max 5 MB</Text>
              </View>
              <View style={styles.browseBtn}>
                <Text style={styles.browseBtnText}>Browse</Text>
              </View>
            </TouchableOpacity>

            {/* Target role input */}
            <Text style={styles.inputLabel}>Target Role</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Backend Developer"
              placeholderTextColor={colors.outline}
              value={targetRole}
              onChangeText={setTargetRole}
              autoCapitalize="words"
              returnKeyType="done"
            />

            {/* Analyse button */}
            <TouchableOpacity
              style={[styles.analyseBtn, !canAnalyse && styles.analyseBtnDisabled]}
              onPress={handleAnalyse}
              disabled={!canAnalyse}
              activeOpacity={0.85}
            >
              <Text style={[styles.analyseBtnText, !canAnalyse && styles.analyseBtnTextDisabled]}>
                Analyse CV
              </Text>
            </TouchableOpacity>

            {/* Error message */}
            {analyseError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{analyseError}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── History section ── */}
        <Text style={styles.sectionLabel}>Past Analyses</Text>

        {isLoadingHistory ? (
          <ActivityIndicator size="small" color={colors.secondary} style={styles.historyLoader} />
        ) : historyError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
            <Text style={styles.errorText}>{historyError}</Text>
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-outline" size={32} color={colors.outline} />
            <Text style={styles.emptyTitle}>No past analyses yet</Text>
            <Text style={styles.emptySubtitle}>Upload your CV to get your first analysis</Text>
          </View>
        ) : (
          <View style={styles.reportsList}>
            {reports.map(report => (
              <ReportRow
                key={report.reportId}
                report={report}
                onPress={() => router.push(`/gap-report/${report.reportId}`)}
                onDelete={() => handleDelete(report)}
                isDeleting={deletingId === report.reportId}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },

  // ── Analysing state ──
  analysingCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.secondary}30`,
  },
  analysingTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  analysingSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },

  // ── Upload section ──
  uploadSection: {
    gap: spacing.sm,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fileCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCardBody: {
    flex: 1,
    gap: 2,
  },
  fileCardText: {
    ...typography.labelMd,
    color: colors.outline,
  },
  fileCardTextPicked: {
    color: colors.onSurface,
  },
  fileCardHint: {
    ...typography.labelSm,
    color: colors.outline,
  },
  browseBtn: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  browseBtnText: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  inputLabel: {
    ...typography.labelMd,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    ...typography.bodyMd,
    color: colors.onSurface,
  },
  analyseBtn: {
    backgroundColor: colors.secondary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  analyseBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  analyseBtnText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
  analyseBtnTextDisabled: {
    color: colors.outline,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  errorText: {
    ...typography.labelMd,
    color: colors.error,
    flex: 1,
  },

  // ── History section ──
  historyLoader: {
    marginVertical: spacing.lg,
  },
  emptyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  emptyTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  emptySubtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  reportsList: {
    gap: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  reportRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: `${colors.secondary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportRowBody: {
    flex: 1,
    gap: 2,
  },
  reportRowTitle: {
    ...typography.labelMd,
    color: colors.onSurface,
  },
  reportRowMeta: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
