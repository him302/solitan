import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, Card, Status, LoadingState, ErrorState, Button } from '@soliton/ui';
import { useMySalon } from '../../src/hooks/useMySalon';
import { useSalonOverview } from '../../src/hooks/useReporting';
import { useAuthStore } from '../../src/auth/authStore';

export default function DashboardScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);

  const { data: salon, isLoading, isError, refetch } = useMySalon();
  const { data: overview } = useSalonOverview(salon?.id ?? null, 'today');

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
          <DashboardLink label="Edit Profile"  emoji="✏️" onPress={() => router.push('/(manage)/profile')} />
          <DashboardLink label="Services"      emoji="💈" onPress={() => router.push('/(manage)/services')} />
          <DashboardLink label="Hours"         emoji="🕐" onPress={() => router.push('/(manage)/hours')} />
          <DashboardLink label="Live Queue"    emoji="📋" onPress={() => router.push('/(manage)/queue')} />
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
