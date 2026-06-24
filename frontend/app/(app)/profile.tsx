import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NaviiAvatar } from '@/components/NaviiAvatar';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { state, logout } = useAuth();
  const user = state.user;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.avatarSection}>
          <NaviiAvatar
            seed={user?.id}
            size={96}
            fallback={`${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase()}
            style={styles.avatarShadow}
          />
          <Text style={styles.name}>
            {user?.firstName ?? 'Guest'} {user?.lastName ?? ''}
          </Text>
          <Text style={styles.role}>{user?.role ?? 'User'}</Text>
        </View>

        <View style={styles.card}>
          <InfoRow label="Email" value={user?.email ?? '—'} />
          <InfoRow label="Role" value={user?.role ?? '—'} />
          <InfoRow
            label="Email verified"
            value={user?.emailVerified ? 'Yes' : 'No'}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
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
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    ...typography.headlineLg,
    color: colors.primary,
    marginBottom: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarShadow: {
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  name: {
    ...typography.headlineSm,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  role: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  infoLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    ...typography.labelMd,
    color: colors.onPrimary,
  },
});
