import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@soliton/ui';

/** Tab layout for salon management screens. */
export default function ManageLayout() {
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
          title: t('salon.dashboard.title'),
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('salon.profile.title'),
          tabBarIcon: ({ color }) => <TabIcon label="✏️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: t('salon.services.title'),
          tabBarIcon: ({ color }) => <TabIcon label="💈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="hours"
        options={{
          title: t('salon.hours.title'),
          tabBarIcon: ({ color }) => <TabIcon label="🕐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: t('staffQueue.title'),
          tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <TabIcon label="📅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          title: 'Reviews',
          tabBarIcon: ({ color }) => <TabIcon label="⭐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <TabIcon label="📊" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ label, color }: { label: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}
