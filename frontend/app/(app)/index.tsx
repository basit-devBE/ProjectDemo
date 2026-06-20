import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, radius } from '@/constants/theme';

export default function HomeScreen() {
  const { state, logout } = useAuth();
  const user = state.user;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.greeting}>
          Welcome, {user?.firstName}!
        </Text>
        <Text style={styles.role}>{user?.role}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  greeting: { ...typography.headlineLg, color: colors.primary, marginBottom: spacing.sm },
  role: {
    ...typography.labelMd,
    color: colors.secondary,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  logoutText: { ...typography.labelMd, color: colors.onSurface },
});
