import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/auth/authStore';
import { ScissorCutSplash } from '../src/splash/ScissorCutSplash';

/**
 * App entry. Plays the Solitan opening animation while the stored session hydrates, then
 * routes by role. The two run concurrently on purpose: hydration reads SecureStore, and
 * waiting for it before animating would turn a cold start into a blank screen.
 *
 * Module-level rather than component state, so returning to "/" later in the session (for
 * example via a hardware back press out of onboarding) does not replay the whole sequence.
 * It resets naturally on a cold start, which is when the animation is wanted.
 */
let hasPlayedThisLaunch = false;

export default function Index() {
  const router = useRouter();
  const { status, user, hydrate } = useAuthStore();
  const [animationDone, setAnimationDone] = useState(hasPlayedThisLaunch);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const handleDone = useCallback(() => {
    hasPlayedThisLaunch = true;
    setAnimationDone(true);
  }, []);

  useEffect(() => {
    // Route only once both the animation has finished and we know who the user is;
    // whichever completes second triggers the navigation.
    if (!animationDone || status === 'unknown') return;

    if (status === 'unauthenticated') {
      router.replace('/onboarding');
      return;
    }
    if (user?.role === 'owner' || user?.role === 'staff') {
      router.replace('/(manage)');
    } else {
      router.replace('/(tabs)');
    }
  }, [animationDone, status, user, router]);

  // Once the sequence has played this launch, show the revealed brand rather than
  // re-cutting the cloth; it is only on screen for the moment hydration takes.
  return <ScissorCutSplash onDone={handleDone} skipAnimation={hasPlayedThisLaunch} />;
}
