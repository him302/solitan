import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useTheme } from '@soliton/ui';
import { useMySalon } from '../../src/hooks/useMySalon';

/**
 * Owner and staff share this section, but not the same tabs.
 *
 * Previously every tab was shown to both, so a staff member reached the salon profile,
 * service pricing, operating hours, reviews and analytics -- all owner-only concerns.
 * The server already refuses those writes (SalonAccessService.assertManager), so this was
 * a UI leak rather than a data breach, but it offered controls that could only fail.
 *
 * Tabs are hidden with `href: null` rather than omitted, so the routes stay registered
 * and a deep link resolves instead of 404ing. Hiding is presentation; the authorization
 * boundary remains server-side.
 */
export default function ManageLayout() {
  const theme = useTheme();
  const { data: salon } = useMySalon();

  // Until /me/salon resolves, assume the narrower role: showing owner tabs to a staff
  // member and withdrawing them a moment later is worse than revealing them late.
  const isOwner = salon?.viewerRole === 'owner' || salon?.viewerRole === 'admin';
  const ownerOnly = isOwner ? {} : { href: null as null };

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
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          ...ownerOnly,
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon label="✏️" color={color} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          ...ownerOnly,
          title: 'Services',
          tabBarIcon: ({ color }) => <TabIcon label="💈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="hours"
        options={{
          ...ownerOnly,
          title: 'Hours',
          tabBarIcon: ({ color }) => <TabIcon label="🕐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color }) => <TabIcon label="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="staff"
        options={{
          ...ownerOnly,
          title: 'Staff',
          tabBarIcon: ({ color }) => <TabIcon label="👥" color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          ...ownerOnly,
          title: 'Bookings',
          tabBarIcon: ({ color }) => <TabIcon label="📅" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reviews"
        options={{
          ...ownerOnly,
          title: 'Reviews',
          tabBarIcon: ({ color }) => <TabIcon label="⭐" color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          ...ownerOnly,
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
