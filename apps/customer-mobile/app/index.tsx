import { Redirect } from 'expo-router';

/** Root route redirects to the tabs group (discovery). */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
