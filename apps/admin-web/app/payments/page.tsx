'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PaymentDto, PaymentStatus } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Paid', value: 'paid' },
  { label: 'Refunded', value: 'refunded' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const;

const STATUS_COLORS: Record<PaymentStatus, string> = {
  none: '#605E57',
  pending: '#9A5B00',
  paid: '#1F7A38',
  failed: '#B32430',
  refunded: '#3B5BDB',
  cancelled: '#605E57',
};

function formatAmount(cents: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : currency + ' ';
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const user = authClient.getUser();
  const [items, setItems] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<PaymentStatus | undefined>(undefined);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    api.admin
      .listPayments(undefined, 50, filter)
      .then((res) => setItems(res.items))
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, [user, router, filter]);

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Payments</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>
            Payment records — read-only view. Real payment processing is disabled.
          </p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value as PaymentStatus | undefined)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid var(--color-line, #E9E3D6)',
              cursor: 'pointer',
              fontWeight: filter === f.value ? 700 : 400,
              backgroundColor: filter === f.value ? 'var(--color-accent, #3B5BDB)' : 'transparent',
              color: filter === f.value ? '#fff' : 'inherit',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'var(--color-danger, #B32430)', marginBottom: 16 }}>{error}</p>}
      {loading && <p>Loading…</p>}

      {!loading && items.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)' }}>No payment records match this filter.</p>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="Payments">
          <thead>
            <tr>
              {['Payment ID', 'Salon', 'Amount', 'Status', 'Provider', 'Date'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: 12 }}>
                  {p.id.slice(0, 8)}…
                </td>
                <td style={cellStyle}>{p.salonName ?? '—'}</td>
                <td style={{ ...cellStyle, fontVariantNumeric: 'tabular-nums' }}>
                  {formatAmount(p.amountCents, p.currency)}
                </td>
                <td style={cellStyle}>
                  <StatusBadge label={p.status} color={STATUS_COLORS[p.status]} />
                </td>
                <td style={cellStyle}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    backgroundColor: 'var(--color-line, #E9E3D6)',
                  }}>
                    {p.provider}
                  </span>
                </td>
                <td style={cellStyle}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: '2px solid var(--color-line, #E9E3D6)',
  whiteSpace: 'nowrap',
};

const cellStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid var(--color-line, #E9E3D6)',
  verticalAlign: 'top',
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 12,
      fontSize: 13,
      fontWeight: 600,
      color,
      backgroundColor: `${color}15`,
    }}>
      {label}
    </span>
  );
}
