import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/AppProviders';

/** Root layout: provider composition wrapping the router stack. */
export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="salon/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="booking/confirm" options={{ presentation: 'modal' }} />
        <Stack.Screen name="queue/[bookingId]" options={{ presentation: 'card' }} />
      </Stack>
    </AppProviders>
  );
}
