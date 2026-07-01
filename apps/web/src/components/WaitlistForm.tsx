'use client';

import { useState } from 'react';

export function WaitlistForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, slug }),
    });
    setStatus(res.ok ? 'sent' : 'error');
  }

  if (status === 'sent') return <p style={{ color: 'var(--color-live)', fontSize: 13 }}>You're on the list.</p>;

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        style={{ flex: 1 }}
      />
      <button type="submit">Notify Me</button>
    </form>
  );
}
