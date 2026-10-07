import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/auth/authStore';

const MAROON = '#A50000';

export default function Index() {
  const router = useRouter();
  const { status, user, hydrate } = useAuthStore();

  useEffect(() => {
    void hydrate();
  }, []);

  useEffect(() => {
    if (status === 'unknown') return;
    if (status === 'unauthenticated') {
      router.replace('/splash');
      return;
    }
    if (user?.role === 'owner' || user?.role === 'staff') {
      router.replace('/(manage)');
    } else {
      router.replace('/(tabs)');
    }
  }, [status, user, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
      <ActivityIndicator size="large" color={MAROON} />
    </View>
  );
}
