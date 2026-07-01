'use client';

import { useState } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [me, setMe] = useState<unknown>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (mode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error);
        return;
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    setMessage(result?.error ?? 'Signed in.');
  }

  async function checkMe() {
    const res = await apiFetch('/me');
    setMe(res.ok ? await res.json() : { error: `${res.status}` });
  }

  if (status === 'authenticated') {
    return (
      <main style={{ padding: 40, fontFamily: 'system-ui' }}>
        <p>Signed in as {session.user?.email}</p>
        <button onClick={checkMe}>Check /me on the API</button>
        {me ? <pre>{JSON.stringify(me, null, 2)}</pre> : null}
        <div>
          <button onClick={() => signOut()}>Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 40, fontFamily: 'system-ui', maxWidth: 320 }}>
      <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <button type="submit">{mode === 'signin' ? 'Sign in' : 'Register'}</button>
      </form>
      <button onClick={() => signIn('google')}>Continue with Google</button>
      <p>
        <button onClick={() => setMode(mode === 'signin' ? 'register' : 'signin')}>
          {mode === 'signin' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </p>
      {message ? <p>{message}</p> : null}
    </main>
  );
}
