'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { authClient } from '../lib/authClient';

/**
 * Admin login screen. Authenticates via the API and stores the session in memory.
 * Only admin-role users should access this; the backend enforces role checks on
 * protected endpoints.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const tokens = await api.auth.login(email, password);
      const user = await api.auth.me();
      authClient.setSession(tokens.accessToken, user);
      router.push('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: '96px auto', padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Soliton Admin</h1>
      <p style={{ color: 'var(--color-ink-soft)', marginTop: 0 }}>Platform management</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Password"
          required
        />
        {error && <p style={{ color: 'var(--color-danger, #B32430)', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ color: 'var(--color-ink-soft)', fontSize: 13, marginTop: 16 }}>
        Dev credentials: admin@soliton.local / Passw0rd!dev
      </p>
    </main>
  );
}
