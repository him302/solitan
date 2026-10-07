'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ComplaintDto, ComplaintStatus } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Open', value: 'open' },
  { label: 'In Review', value: 'in_review' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Dismissed', value: 'dismissed' },
] as const;

const STATUS_COLORS: Record<ComplaintStatus, string> = {
  open: '#B32430',
  in_review: '#9A5B00',
  resolved: '#1F7A38',
  dismissed: '#605E57',
};

const CATEGORY_LABELS: Record<string, string> = {
  service: 'Service',
  wait_time: 'Wait time',
  booking: 'Booking',
  staff_behaviour: 'Staff',
  payment: 'Payment',
  other: 'Other',
};

export default function AdminComplaintsPage() {
  const router = useRouter();
  const user = authClient.getUser();
  const [items, setItems] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ComplaintStatus | undefined>(undefined);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    api.admin
      .listComplaints(undefined, 50, filter)
      .then((res) => setItems(res.items))
      .catch(() => setError('Failed to load complaints.'))
      .finally(() => setLoading(false));
  }, [user, router, filter]);

  async function updateStatus(id: string, status: ComplaintStatus) {
    setActing(id);
    try {
      const updated = await api.admin.updateComplaint(id, {
        status,
        adminNote: actionNote[id] || undefined,
      });
      setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setError('Action failed — please try again.');
    } finally {
      setActing(null);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: '48px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Complaints</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>Customer reports</p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value as ComplaintStatus | undefined)}
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
        <p style={{ color: 'var(--color-ink-soft)' }}>No complaints match this filter.</p>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="Complaints">
          <thead>
            <tr>
              {['Salon', 'Category', 'Description', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td style={cellStyle}>{c.salonName ?? '—'}</td>
                <td style={cellStyle}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    backgroundColor: 'var(--color-line, #E9E3D6)',
                  }}>
                    {CATEGORY_LABELS[c.category] ?? c.category}
                  </span>
                </td>
                <td style={{ ...cellStyle, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.body}
                </td>
                <td style={cellStyle}>
                  <StatusBadge label={c.status} color={STATUS_COLORS[c.status]} />
                </td>
                <td style={cellStyle}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      placeholder="Admin note (optional)"
                      value={actionNote[c.id] ?? ''}
                      onChange={(e) => setActionNote((n) => ({ ...n, [c.id]: e.target.value }))}
                      style={{ fontSize: 12, padding: '2px 6px', width: 160 }}
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.status !== 'in_review' && (
                        <ActionButton label="In Review" color="#9A5B00" disabled={acting === c.id}
                          onClick={() => updateStatus(c.id, 'in_review')} />
                      )}
                      {c.status !== 'resolved' && (
                        <ActionButton label="Resolve" color="#1F7A38" disabled={acting === c.id}
                          onClick={() => updateStatus(c.id, 'resolved')} />
                      )}
                      {c.status !== 'dismissed' && (
                        <ActionButton label="Dismiss" color="#605E57" disabled={acting === c.id}
                          onClick={() => updateStatus(c.id, 'dismissed')} />
                      )}
                      {c.status !== 'open' && (
                        <ActionButton label="Reopen" color="#B32430" disabled={acting === c.id}
                          onClick={() => updateStatus(c.id, 'open')} />
                      )}
                    </div>
                  </div>
                </td>
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
      {label.replace('_', ' ')}
    </span>
  );
}

function ActionButton({
  label, color, disabled, onClick,
}: {
  label: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '2px 8px',
        fontSize: 12,
        borderRadius: 4,
        border: `1px solid ${color}`,
        color,
        background: 'transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}
