import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@soliton/ui';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 20 }}>{label}</Text>;
}

/** Bottom tab layout for customer navigation: Discover | Activity | Profile */
export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.inkSoft,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.line,
          borderTopWidth: theme.borderWidth.hairline,
        },
        tabBarLabelStyle: {
          fontSize: theme.type.caption.size,
          fontWeight: theme.type.caption.weight,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('discovery.title'),
          tabBarIcon: () => <TabIcon label="🔍" />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('activity.title'),
          tabBarIcon: () => <TabIcon label="📋" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarIcon: () => <TabIcon label="👤" />,
        }}
      />
      {/* Hidden: legacy settings route kept for backward compat, functionality moved to profile */}
      <Tabs.Screen
        name="settings"
        options={{ href: null }}
      />
    </Tabs>
  );
}
