import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@soliton/ui';

/** Bottom tab layout for customer navigation. */
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
          tabBarIcon: ({ color }) => <TabIcon label="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}

/** Simple emoji-based tab icon (avoids adding an icon library dependency). */
function TabIcon({ label, color }: { label: string; color: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}
