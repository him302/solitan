import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/AppProviders';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        {/* "index" is the opening animation as well as the entry route — there is no
            separate splash screen to keep in sync with it. */}
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="location-permission" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(manage)" />
        <Stack.Screen name="assistant" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="legal" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="salon/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="booking/confirm" options={{ presentation: 'modal' }} />
        <Stack.Screen name="queue/[bookingId]" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </AppProviders>
  );
}
