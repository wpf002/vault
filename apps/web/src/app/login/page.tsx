'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * The front door. With the login-first gate (middleware.ts), this is the
 * only page an unauthenticated visitor can reach — so it carries the
 * product pitch and both the sign-in and register flows in one card.
 */
export default function LoginPage() {
  // useSearchParams needs a Suspense boundary or Next's build deopts the page.
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/';

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in (or just became so) → into the app.
  useEffect(() => {
    if (status === 'authenticated') router.replace(from);
  }, [status, from, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    if (mode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not create that account.');
        setBusy(false);
        return;
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    setBusy(false);
    if (result?.error) {
      setError(mode === 'signin' ? 'Wrong email or password.' : 'Signed up, but sign-in failed — try signing in.');
      return;
    }
    router.replace(from);
  }

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Welcome to Vault</h1>
          <p style={{ color: 'var(--color-text-dim)', marginTop: 8 }}>
            120 mini-apps, one account.{' '}
            {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Create an account to get started.'}
          </p>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
            <button type="submit" className="primary" disabled={busy} data-testid="submit-button">
              {busy ? 'One moment…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <button onClick={() => signIn('google', { callbackUrl: from })} disabled={busy}>
            Continue with Google
          </button>

          {error && (
            <p style={{ color: '#ff6b5e', fontSize: 13, margin: 0, textAlign: 'center' }} data-testid="login-error">
              {error}
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: 14, color: 'var(--color-text-dim)' }}>
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'register' : 'signin');
              setError(null);
            }}
            data-testid="mode-toggle"
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0, fontSize: 14 }}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </main>
  );
}
