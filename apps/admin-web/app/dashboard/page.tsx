'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DiscoveryPage } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

/**
 * Admin dashboard — basic salon list. In Phase 1 this is a read-only list so the admin
 * can inspect salons on the platform. Full management comes in later phases.
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = authClient.getUser();
  const [data, setData] = useState<DiscoveryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    api.discovery
      .search({ limit: 50 })
      .then(setData)
      .catch(() => setError('Failed to load salons.'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      /* best effort */
    }
    authClient.clear();
    router.replace('/login');
  };

  return (
    <main style={{ maxWidth: 1024, margin: '48px auto', padding: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>
            Signed in as {user?.name ?? user?.email ?? 'admin'}
          </p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>
          Sign out
        </button>
      </div>

      {loading && <p>Loading salons…</p>}
      {error && <p style={{ color: 'var(--color-danger, #B32430)' }}>{error}</p>}

      {data && (
        <>
          <h2 style={{ marginBottom: 16 }}>
            Salons ({data.items.length}
            {data.page.nextOffset !== null ? '+' : ''})
          </h2>

          {data.items.length === 0 ? (
            <p style={{ color: 'var(--color-ink-soft)' }}>No salons on the platform yet.</p>
          ) : (
            <table
              style={{ width: '100%', borderCollapse: 'collapse' }}
              role="table"
              aria-label="Salons"
            >
              <thead>
                <tr>
                  {['Name', 'City', 'Status', 'Open State'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderBottom: '2px solid var(--color-line, #E9E3D6)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((salon) => (
                  <tr key={salon.id}>
                    <td style={cellStyle}>{salon.name}</td>
                    <td style={cellStyle}>{salon.city ?? '—'}</td>
                    <td style={cellStyle}>
                      <StatusBadge label={salon.status} />
                    </td>
                    <td style={cellStyle}>
                      <StatusBadge label={salon.openState} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-line, #E9E3D6)',
};

function StatusBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    active: '#1F7A38',
    open: '#1F7A38',
    pending: '#9A5B00',
    closed: '#605E57',
    unconfigured: '#605E57',
    suspended: '#B32430',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        color: colors[label] ?? '#605E57',
        backgroundColor: `${colors[label] ?? '#605E57'}15`,
      }}
    >
      {label}
    </span>
  );
}
