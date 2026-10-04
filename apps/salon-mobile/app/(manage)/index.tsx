import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, Card, Status, LoadingState, ErrorState, Button } from '@soliton/ui';
import { useMySalon } from '../../src/hooks/useMySalon';
import { useAuthStore } from '../../src/auth/authStore';
import { api } from '../../src/api';

/** Salon dashboard — overview of salon state. */
export default function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const user = useAuthStore((s) => s.user);

  const { data: salon, isLoading, isError, refetch } = useMySalon();

  if (isLoading) return <LoadingState label={t('common.loading')} />;
  if (isError || !salon) {
    return (
      <ErrorState
        title={t('errors.loadFailed')}
        body={t('errors.networkError')}
        onRetry={() => refetch()}
        retryLabel={t('common.retry')}
      />
    );
  }

  const openStateLabel =
    salon.openState === 'open'
      ? t('discovery.open')
      : salon.openState === 'unconfigured'
        ? t('discovery.unconfigured')
        : t('discovery.closed');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: theme.spacing.s4,
          paddingBottom: insets.bottom + theme.spacing.s6,
          gap: theme.spacing.s4,
        }}
      >
        {/* Welcome */}
        <Text
          style={{
            fontSize: theme.type.title.size,
            fontWeight: theme.type.title.weight,
            color: theme.colors.ink,
          }}
        >
          {t('salon.dashboard.welcome', { name: user?.name ?? salon.name })}
        </Text>

        {/* Salon info card */}
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
              label={openStateLabel}
            />
            <Status kind={salon.status === 'active' ? 'info' : 'warning'} label={salon.status} />
          </View>
          {salon.address && (
            <Text style={{ color: theme.colors.inkSoft, marginTop: theme.spacing.s2 }}>
              {salon.address}
              {salon.city ? `, ${salon.city}` : ''}
            </Text>
          )}
          {!salon.hoursConfigured && (
            <Text
              style={{
                color: theme.colors.warning,
                fontSize: theme.type.caption.size,
                marginTop: theme.spacing.s2,
              }}
            >
              {t('discovery.unconfigured')} — {t('salon.hours.title')}
            </Text>
          )}
        </Card>

        {/* Quick links */}
        <View style={{ gap: theme.spacing.s3 }}>
          <DashboardLink
            label={t('salon.dashboard.profile')}
            emoji="✏️"
            onPress={() => router.push('/(manage)/profile')}
          />
          <DashboardLink
            label={t('salon.dashboard.services')}
            emoji="💈"
            onPress={() => router.push('/(manage)/services')}
          />
          <DashboardLink
            label={t('salon.dashboard.hours')}
            emoji="🕐"
            onPress={() => router.push('/(manage)/hours')}
          />
          <DashboardLink
            label={t('staffQueue.title')}
            emoji="📋"
            onPress={() => router.push('/(manage)/queue')}
          />
        </View>

        {/* Sign out */}
        <Button
          label={t('salon.signOut')}
          variant="tertiary"
          onPress={async () => {
            try {
              await api_logout();
            } catch {
              /* ignore */
            }
            await signOut();
            router.replace('/login');
          }}
        />
      </ScrollView>
    </View>
  );
}

/** Quick navigation card link. */
function DashboardLink({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s3 }}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
          <Text
            style={{
              fontSize: theme.type.body.size,
              fontWeight: theme.type.label.weight,
              color: theme.colors.ink,
              flex: 1,
            }}
          >
            {label}
          </Text>
          <Text style={{ color: theme.colors.inkSoft }}>→</Text>
        </View>
      </Card>
    </Pressable>
  );
}

async function api_logout() {
  await api.auth.logout();
}
