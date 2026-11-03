import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, Card, Status, LoadingState, ErrorState, Button } from '@soliton/ui';
import { useMySalon } from '../../src/hooks/useMySalon';
import { useSalonOverview } from '../../src/hooks/useReporting';
import { useSetOwnShift } from '../../src/hooks/useStaff';
import { useAuthStore } from '../../src/auth/authStore';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);

  const { data: salon, isLoading, isError, refetch } = useMySalon();

  const isOwner = salon?.viewerRole === 'owner' || salon?.viewerRole === 'admin';

  // Salon-wide takings and ratings are owner information. Passing null for staff also
  // avoids firing a request the server would refuse.
  const { data: overview } = useSalonOverview(isOwner ? salon?.id ?? null : null, 'today');

  if (isLoading) return <LoadingState label="Loading…" />;
  if (isError || !salon) {
    return (
      <ErrorState
        title="Could not load salon"
        body="Check your connection and try again."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          Welcome, {user?.name ?? salon.name}
        </Text>

        <Card>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
            }}
          >
            {salon.name}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.s2,
              marginTop: theme.spacing.s2,
            }}
          >
            <Status
              kind={salon.openState === 'open' ? 'success' : 'neutral'}
              label={salon.openState === 'open' ? 'Open' : salon.openState === 'unconfigured' ? 'Unconfigured' : 'Closed'}
            />
            <Status kind={salon.status === 'active' ? 'info' : 'warning'} label={salon.status} />
          </View>
          {salon.address && (
            <Text style={{ color: theme.colors.inkSoft, marginTop: theme.spacing.s2 }}>
              {salon.address}{salon.city ? `, ${salon.city}` : ''}
            </Text>
          )}
        </Card>

        {/* Sc.47 — Queue not activated warning */}
        {salon.openState === 'open' && salon.queueStatus !== 'open' && salon.queueStatus !== 'limited' && (
          <Pressable
            onPress={() => router.push('/(manage)/queue')}
            accessibilityRole="button"
            style={{ backgroundColor: '#FFF3E0', borderRadius: 12, padding: theme.spacing.s4, borderWidth: 1.5, borderColor: '#E65100', flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Text style={{ fontSize: 22 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 14 }}>Queue not activated</Text>
              <Text style={{ color: '#BF360C', fontSize: 13, marginTop: 2 }}>
                Your salon is open but the queue is {salon.queueStatus}. Tap to manage the queue.
              </Text>
            </View>
            <Text style={{ color: '#E65100', fontSize: 18 }}>›</Text>
          </Pressable>
        )}

        {salon.viewerOnShift !== null && <ShiftCard onShift={salon.viewerOnShift} />}

        {overview && (
          <View style={{ gap: theme.spacing.s3 }}>
            <Text style={{ fontSize: theme.type.label.size, fontWeight: theme.type.label.weight, color: theme.colors.ink }}>
              Today
            </Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.s3 }}>
              <StatCard label="Live Queue" value={String(overview.currentQueueSize)} accent theme={theme} />
              <StatCard label="Completed"  value={String(overview.todayCompleted)}  theme={theme} />
              <StatCard label="Appointments" value={String(overview.todayAppointments)} theme={theme} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.s3 }}>
              <StatCard
                label="Avg Wait"
                value={overview.avgWaitMinutes !== null ? `${overview.avgWaitMinutes} min` : '—'}
                theme={theme}
              />
              <StatCard
                label="Rating"
                value={overview.averageRating !== null ? `${overview.averageRating.toFixed(1)} ★` : '—'}
                theme={theme}
              />
              <StatCard label="Reviews" value={String(overview.reviewCount)} theme={theme} />
            </View>
          </View>
        )}

        <View style={{ gap: theme.spacing.s3 }}>
          {/* Configuration is owner-only; the server refuses these writes for staff, so
              offering them would only produce errors. */}
          {isOwner && (
            <>
              <DashboardLink label="Edit Profile" emoji="✏️" onPress={() => router.push('/(manage)/profile')} />
              <DashboardLink label="Services"     emoji="💈" onPress={() => router.push('/(manage)/services')} />
              <DashboardLink label="Hours"        emoji="🕐" onPress={() => router.push('/(manage)/hours')} />
              <DashboardLink label="Staff"        emoji="👥" onPress={() => router.push('/(manage)/staff')} />
            </>
          )}
          <DashboardLink label="Live Queue" emoji="📋" onPress={() => router.push('/(manage)/queue')} />
          <DashboardLink label="Solitan Assistant" emoji="✨" onPress={() => router.push('/assistant')} />
        </View>

        <Button
          label="Sign Out"
          variant="tertiary"
          onPress={async () => {
            await signOut();
            router.replace('/login');
          }}
        />
      </ScrollView>
    </View>
  );
}

/**
 * The signed-in member's own availability. Separate from the owner roster: it posts to
 * /me/shift, which takes no staff id, so nobody can clock a colleague on or off.
 */
function ShiftCard({ onShift }: { onShift: boolean }) {
  const theme = useTheme();
  const setOwnShift = useSetOwnShift();

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: theme.type.section.size,
              fontWeight: theme.type.section.weight,
              color: theme.colors.ink,
            }}
          >
            {onShift ? 'You are on shift' : 'You are off shift'}
          </Text>
          <Text style={{ color: theme.colors.inkSoft, fontSize: theme.type.caption.size }}>
            {onShift
              ? 'You can be assigned customers, and you count towards waiting times.'
              : 'You will not be assigned customers while you are off shift.'}
          </Text>
        </View>
        <Switch
          value={onShift}
          disabled={setOwnShift.isPending}
          onValueChange={(value) =>
            setOwnShift.mutate(value, {
              onError: (error: Error) =>
                Alert.alert('Could not change shift', error.message || 'Please try again.'),
            })
          }
        />
      </View>
    </Card>
  );
}

function DashboardLink({ label, emoji, onPress }: { label: string; emoji: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
          <Text style={{ fontSize: theme.type.body.size, fontWeight: theme.type.label.weight, color: theme.colors.ink, flex: 1 }}>
            {label}
          </Text>
          <Text style={{ color: theme.colors.inkSoft }}>→</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function StatCard({ label, value, accent, theme }: { label: string; value: string; accent?: boolean; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, padding: theme.spacing.s3, alignItems: 'center' }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: accent ? theme.colors.accent : theme.colors.ink }}>
        {value}
      </Text>
      <Text style={{ fontSize: theme.type.caption.size, color: theme.colors.inkSoft, textAlign: 'center', marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}
