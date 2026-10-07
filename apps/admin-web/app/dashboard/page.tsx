'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformOverviewDto, AnalyticsDatePreset } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

const PRESETS: { label: string; value: AnalyticsDatePreset }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
];

const NAV_CARDS = [
  { href: '/salons',     label: '🏪 Salons',     desc: 'Directory & management' },
  { href: '/reviews',    label: '⭐ Reviews',    desc: 'Moderation queue' },
  { href: '/complaints', label: '🚩 Complaints', desc: 'Customer reports' },
  { href: '/payments',   label: '💳 Payments',   desc: 'Payment records' },
];

export default function DashboardPage() {
  const router = useRouter();
  const user = authClient.getUser();
  const [data, setData] = useState<PlatformOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<AnalyticsDatePreset>('today');

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    setError('');
    api.admin
      .analyticsOverview({ preset })
      .then(setData)
      .catch(() => setError('Unable to load analytics.'))
      .finally(() => setLoading(false));
  }, [user, router, preset]);

  const handleLogout = async () => {
    try { await api.auth.logout(); } catch { /* best effort */ }
    authClient.clear();
    router.replace('/login');
  };

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Soliton Admin</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>
            Signed in as {user?.name ?? user?.email ?? 'admin'}
          </p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px' }}>Sign out</button>
      </div>

      {/* Nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {NAV_CARDS.map((nav) => (
          <a key={nav.href} href={nav.href} style={navCardStyle}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{nav.label}</div>
            <div style={{ color: 'var(--color-ink-soft)', fontSize: 12, marginTop: 4 }}>{nav.desc}</div>
          </a>
        ))}
      </div>

      {/* Date filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ fontSize: 14, color: 'var(--color-ink-soft)', marginRight: 4 }}>Period:</span>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPreset(p.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid var(--color-line, #E9E3D6)',
              cursor: 'pointer',
              fontWeight: preset === p.value ? 700 : 400,
              backgroundColor: preset === p.value ? 'var(--color-accent, #3B5BDB)' : 'transparent',
              color: preset === p.value ? '#fff' : 'inherit',
              fontSize: 13,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Platform overview */}
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Platform Overview</h2>

      {error && (
        <div style={{ color: 'var(--color-danger, #B32430)', marginBottom: 16 }}>
          {error}{' '}
          <button onClick={() => setPreset(preset)} style={{ fontSize: 12 }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ ...statCardStyle, height: 90, backgroundColor: 'var(--color-line, #E9E3D6)', borderRadius: 8 }} />
          ))}
        </div>
      ) : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <StatCard label="Total Salons"      value={data.salons.total}            />
            <StatCard label="Active Salons"     value={data.salons.active}           accent />
            <StatCard label="Customers"         value={data.customers}               />
            <StatCard label="Queue Entries"     value={data.queueEntries}            />
            <StatCard label="Completed Services" value={data.queueCompleted}         accent />
            <StatCard label="Appointments"      value={data.appointments}            />
            <StatCard label="Reviews"           value={data.reviews}                 />
            <StatCard label="Complaints"        value={data.complaints}              />
          </div>

          {data.averageRating !== null && (
            <div style={{ display: 'flex', gap: 32, padding: '12px 16px', backgroundColor: 'var(--color-surface, #FAF8F5)', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
              <span>Avg Rating: <strong>{data.averageRating.toFixed(2)} ★</strong></span>
              <span>Appts Completed: <strong>{data.appointmentsCompleted}</strong></span>
              <span style={{ color: 'var(--color-ink-soft)' }}>
                {data.salons.pending > 0 && `${data.salons.pending} pending`}
                {data.salons.pending > 0 && data.salons.suspended > 0 && ' · '}
                {data.salons.suspended > 0 && `${data.salons.suspended} suspended`}
              </span>
            </div>
          )}

          <p style={{ fontSize: 12, color: 'var(--color-ink-soft)' }}>
            Period: {new Date(data.period.from).toLocaleDateString('en-IN')} – {new Date(data.period.to).toLocaleDateString('en-IN')}
            {' · '}Updated: {new Date(data.generatedAt).toLocaleTimeString('en-IN')}
          </p>
        </>
      )}
    </main>
  );
}

const navCardStyle: React.CSSProperties = {
  display: 'block',
  padding: '16px 20px',
  borderRadius: 8,
  border: '1px solid var(--color-line, #E9E3D6)',
  textDecoration: 'none',
  color: 'inherit',
};

const statCardStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: 8,
  border: '1px solid var(--color-line, #E9E3D6)',
};

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ? 'var(--color-accent, #3B5BDB)' : 'inherit' }}>
        {value.toLocaleString('en-IN')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-ink-soft)', marginTop: 4 }}>{label}</div>
    </div>
  );
}
