'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminSalonRow } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

const STATUS_FILTERS = [
  { label: 'All',       value: undefined },
  { label: 'Active',    value: 'active' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Suspended', value: 'suspended' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  active: '#1F7A38', pending: '#9A5B00', suspended: '#B32430',
};

export default function AdminSalonsPage() {
  const router = useRouter();
  const user = authClient.getUser();

  const [items, setItems]       = useState<AdminSalonRow[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'pending' | 'suspended' | undefined>(undefined);
  const [offset, setOffset]     = useState(0);
  const [acting, setActing]     = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const LIMIT = 25;

  const load = useCallback(() => {
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    setError('');
    api.admin
      .listSalons({ search: search || undefined, status: statusFilter, limit: LIMIT, offset })
      .then((res) => { setItems(res.items); setTotal(res.total); })
      .catch(() => setError('Failed to load salons.'))
      .finally(() => setLoading(false));
  }, [user, router, search, statusFilter, offset]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: 'active' | 'suspended') {
    const action = status === 'active' ? 'activate' : 'suspend';
    const salonName = items.find((s) => s.id === id)?.name ?? 'this salon';
    if (!confirm(`${status === 'active' ? 'Activate' : 'Suspend'} "${salonName}"?\n\n${
      status === 'suspended' ? 'This will prevent customers from joining its queue.' : 'This will make the salon visible to customers.'
    }`)) return;

    setActing(id);
    setActionError('');
    try {
      await api.admin.updateSalonStatus(id, { status });
      setItems((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    } catch {
      setActionError(`Failed to ${action} salon.`);
    } finally {
      setActing(null);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: '48px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Salons</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>
            {total > 0 ? `${total} salon${total !== 1 ? 's' : ''}` : 'Salon directory'}
          </p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px' }}>← Dashboard</button>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, city, or owner…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--color-line, #E9E3D6)', width: 260, fontSize: 14 }}
        />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => { setStatusFilter(f.value as typeof statusFilter); setOffset(0); }}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: '1px solid var(--color-line, #E9E3D6)', cursor: 'pointer',
              fontWeight: statusFilter === f.value ? 700 : 400,
              backgroundColor: statusFilter === f.value ? 'var(--color-accent, #3B5BDB)' : 'transparent',
              color: statusFilter === f.value ? '#fff' : 'inherit', fontSize: 13,
            }}
          >{f.label}</button>
        ))}
      </div>

      {(error || actionError) && (
        <p style={{ color: 'var(--color-danger, #B32430)', marginBottom: 12 }}>{error || actionError}</p>
      )}

      {loading && <p>Loading…</p>}

      {!loading && items.length === 0 && (
        <p style={{ color: 'var(--color-ink-soft)' }}>No salons match this filter.</p>
      )}

      {!loading && items.length > 0 && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="Salons">
            <thead>
              <tr>
                {['Salon', 'Owner', 'Status', 'City', 'Services', 'Queue', 'Rating', 'Created', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={cellStyle}><strong>{s.name}</strong></td>
                  <td style={cellStyle}>
                    <span style={{ display: 'block' }}>{s.ownerName ?? '—'}</span>
                    {s.ownerEmail && <span style={{ fontSize: 11, color: 'var(--color-ink-soft)' }}>{s.ownerEmail}</span>}
                  </td>
                  <td style={cellStyle}>
                    <StatusBadge label={s.status} color={STATUS_COLORS[s.status] ?? '#605E57'} />
                  </td>
                  <td style={cellStyle}>{s.city ?? '—'}</td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>{s.serviceCount}</td>
                  <td style={cellStyle}>
                    <StatusBadge
                      label={s.queueStatus}
                      color={s.queueStatus === 'open' ? '#1F7A38' : '#605E57'}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    {s.averageRating !== null ? `${s.averageRating.toFixed(1)} ★` : '—'}
                    {s.reviewCount > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--color-ink-soft)' }}>{s.reviewCount} reviews</div>
                    )}
                  </td>
                  <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                    {new Date(s.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {s.status !== 'active' && (
                        <ActionButton label="Activate" color="#1F7A38" disabled={acting === s.id}
                          onClick={() => changeStatus(s.id, 'active')} />
                      )}
                      {s.status !== 'suspended' && (
                        <ActionButton label="Suspend" color="#B32430" disabled={acting === s.id}
                          onClick={() => changeStatus(s.id, 'suspended')} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center', fontSize: 14 }}>
            <button
              onClick={() => setOffset(Math.max(0, offset - LIMIT))}
              disabled={offset === 0}
              style={{ padding: '6px 12px', cursor: offset === 0 ? 'not-allowed' : 'pointer' }}
            >← Prev</button>
            <span style={{ color: 'var(--color-ink-soft)' }}>
              {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
            </span>
            <button
              onClick={() => setOffset(offset + LIMIT)}
              disabled={offset + LIMIT >= total}
              style={{ padding: '6px 12px', cursor: offset + LIMIT >= total ? 'not-allowed' : 'pointer' }}
            >Next →</button>
          </div>
        </>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 12px',
  borderBottom: '2px solid var(--color-line, #E9E3D6)', whiteSpace: 'nowrap',
};
const cellStyle: React.CSSProperties = {
  padding: '8px 12px', borderBottom: '1px solid var(--color-line, #E9E3D6)', verticalAlign: 'top',
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 12,
      fontSize: 13, fontWeight: 600, color, backgroundColor: `${color}15`,
    }}>{label}</span>
  );
}

function ActionButton({ label, color, disabled, onClick }: {
  label: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '2px 8px', fontSize: 12, borderRadius: 4,
      border: `1px solid ${color}`, color, background: 'transparent',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    }}>{label}</button>
  );
}
