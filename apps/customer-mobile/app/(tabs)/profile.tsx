import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/auth/authStore';

const MAROON = '#A50000';

function MenuItem({ icon, label, value, danger, onPress }: {
  icon: string;
  label: string;
  value?: string;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress} accessibilityRole="button">
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <Text style={[styles.menuLabel, danger && { color: '#B32430' }]} numberOfLines={1}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Text style={[styles.chevron, danger && { color: '#B32430' }]}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const displayName = user?.name ?? 'Guest';
  const displayEmail = user?.email ?? '';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const canManage = user?.role === 'owner' || user?.role === 'staff';

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Profile</Text>

        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            {displayEmail ? <Text style={styles.userEmail}>{displayEmail}</Text> : null}
          </View>
          <Pressable style={styles.editBtn} accessibilityRole="button">
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>
        </View>

        {canManage && (
          <Pressable style={styles.businessCard} onPress={() => router.replace('/(manage)')} accessibilityRole="button">
            <View>
              <Text style={styles.businessLabel}>🏪 Business Mode</Text>
              <Text style={styles.businessSub}>Switch to salon management</Text>
            </View>
            <Text style={styles.businessArrow}>→</Text>
          </Pressable>
        )}

        <Pressable style={styles.premiumCard}>
          <View>
            <Text style={styles.premiumLabel}>✦ Solitan Premium</Text>
            <Text style={styles.premiumSub}>Priority booking · Exclusive offers</Text>
          </View>
          <Text style={styles.premiumArrow}>→</Text>
        </Pressable>

        <Text style={styles.sectionHeader}>MY ACTIVITY</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="📋" label="My Appointments" />
          <View style={styles.divider} />
          <MenuItem icon="❤️" label="Saved Salons" />
          <View style={styles.divider} />
          <MenuItem icon="⭐" label="Reviews" />
        </View>

        <Text style={styles.sectionHeader}>PREFERENCES</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="🔔" label="Notifications" />
          <View style={styles.divider} />
          <MenuItem icon="📍" label="Location" />
          <View style={styles.divider} />
          <MenuItem icon="💳" label="Payment Methods" />
        </View>

        <Text style={styles.sectionHeader}>SUPPORT</Text>
        <View style={styles.menuCard}>
          <MenuItem icon="❓" label="Help & Support" />
          <View style={styles.divider} />
          <MenuItem icon="📞" label="Contact Us" />
          <View style={styles.divider} />
          <MenuItem icon="📄" label="Terms & Privacy" />
        </View>

        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <View style={styles.menuCard}>
          {user ? (
            <MenuItem icon="🚪" label="Sign Out" danger onPress={() => void handleSignOut()} />
          ) : (
            <MenuItem icon="🔑" label="Sign In" onPress={() => router.push('/login')} />
          )}
        </View>

        <Text style={styles.version}>Solitan v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '700', color: '#1E1E1C', marginTop: 16, marginBottom: 16 },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: MAROON, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  userName: { fontSize: 17, fontWeight: '700', color: '#1E1E1C' },
  userEmail: { fontSize: 13, color: '#8A8780', marginTop: 2 },
  editBtn: { borderWidth: 1.5, borderColor: MAROON, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  editBtnText: { color: MAROON, fontWeight: '700', fontSize: 13 },
  businessCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E1C', borderRadius: 18, padding: 18, marginBottom: 14, elevation: 3, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  businessLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  businessSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  businessArrow: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  premiumCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: MAROON, borderRadius: 18, padding: 18, marginBottom: 20, elevation: 4, shadowColor: MAROON, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  premiumLabel: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  premiumSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  premiumArrow: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: '#B0ADA8', letterSpacing: 1.2, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  menuCard: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52, gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F0EB', alignItems: 'center', justifyContent: 'center' },
  menuIconDanger: { backgroundColor: '#FFF0F0' },
  menuLabel: { fontSize: 15, fontWeight: '500', color: '#1E1E1C' },
  menuValue: { fontSize: 14, color: '#8A8780', marginRight: 4 },
  chevron: { fontSize: 20, color: '#C4BFBA', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F0EDE8', marginLeft: 64 },
  version: { textAlign: 'center', fontSize: 13, color: '#C4BFBA', marginTop: 8, marginBottom: 20 },
});
