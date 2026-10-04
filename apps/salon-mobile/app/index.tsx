import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { LoadingState } from '@soliton/ui';
import { useAuthStore } from '../src/auth/authStore';

/**
 * Auth gate: hydrates the stored session and redirects.
 * Authenticated → manage dashboard, otherwise → login.
 */
export default function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (status === 'unknown') return <LoadingState />;
  if (status === 'authenticated') return <Redirect href="/(manage)" />;
  return <Redirect href="/login" />;
}
