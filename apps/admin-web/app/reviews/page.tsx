'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ReviewDto, ReviewStatus } from '@soliton/api-contract';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Published', value: 'published' },
  { label: 'Hidden', value: 'hidden' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Removed', value: 'removed' },
] as const;

const STATUS_COLORS: Record<ReviewStatus, string> = {
  published: '#1F7A38',
  hidden: '#605E57',
  under_review: '#9A5B00',
  removed: '#B32430',
};

export default function AdminReviewsPage() {
  const router = useRouter();
  const user = authClient.getUser();
  const [items, setItems] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<ReviewStatus | undefined>(undefined);
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    setLoading(true);
    api.admin
      .listReviews(undefined, 50, filter)
      .then((res) => setItems(res.items))
      .catch(() => setError('Failed to load reviews.'))
      .finally(() => setLoading(false));
  }, [user, router, filter]);

  async function moderate(id: string, status: ReviewStatus) {
    setActing(id);
    try {
      const updated = await api.admin.moderateReview(id, {
        status,
        adminNote: actionNote[id] || undefined,
      });
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
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
          <h1 style={{ margin: 0 }}>Reviews</h1>
          <p style={{ color: 'var(--color-ink-soft)', margin: '4px 0 0' }}>Moderation queue</p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px' }}>
          ← Dashboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value as ReviewStatus | undefined)}
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
        <p style={{ color: 'var(--color-ink-soft)' }}>No reviews match this filter.</p>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }} role="table" aria-label="Reviews">
          <thead>
            <tr>
              {['Customer', 'Salon', 'Rating', 'Comment', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((review) => (
              <tr key={review.id}>
                <td style={cellStyle}>{review.customerName ?? '—'}</td>
                <td style={cellStyle}>{review.salonName}</td>
                <td style={cellStyle}>
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </td>
                <td style={{ ...cellStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.comment ?? <em style={{ color: 'var(--color-ink-soft)' }}>No comment</em>}
                </td>
                <td style={cellStyle}>
                  <StatusBadge label={review.status} color={STATUS_COLORS[review.status]} />
                </td>
                <td style={cellStyle}>{new Date(review.createdAt).toLocaleDateString('en-IN')}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input
                      placeholder="Admin note (optional)"
                      value={actionNote[review.id] ?? ''}
                      onChange={(e) => setActionNote((n) => ({ ...n, [review.id]: e.target.value }))}
                      style={{ fontSize: 12, padding: '2px 6px', width: 160 }}
                    />
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {review.status !== 'published' && (
                        <ActionButton
                          label="Restore"
                          color="#1F7A38"
                          disabled={acting === review.id}
                          onClick={() => moderate(review.id, 'published')}
                        />
                      )}
                      {review.status !== 'hidden' && (
                        <ActionButton
                          label="Hide"
                          color="#9A5B00"
                          disabled={acting === review.id}
                          onClick={() => moderate(review.id, 'hidden')}
                        />
                      )}
                      {review.status !== 'under_review' && (
                        <ActionButton
                          label="Flag"
                          color="#605E57"
                          disabled={acting === review.id}
                          onClick={() => moderate(review.id, 'under_review')}
                        />
                      )}
                      {review.status !== 'removed' && (
                        <ActionButton
                          label="Remove"
                          color="#B32430"
                          disabled={acting === review.id}
                          onClick={() => moderate(review.id, 'removed')}
                        />
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
