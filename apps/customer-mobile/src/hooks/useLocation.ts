import { useState, useEffect, useCallback } from 'react';
import type { Location } from '@soliton/api-contract';
import {
  getLocationPermissionStatus,
  getCurrentLocation,
  type PermissionStatus,
} from '../services/location.service';

export interface LocationState {
  permission: PermissionStatus;
  location: Location | null;
  loading: boolean;
  refresh: () => void;
}

export function useLocation(): LocationState {
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const status = await getLocationPermissionStatus();
      if (cancelled) return;
      setPermission(status);
      if (status === 'granted') {
        const loc = await getCurrentLocation();
        if (!cancelled) setLocation(loc);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = refresh();
    return cleanup;
  }, [refresh]);

  return { permission, location, loading, refresh };
}
