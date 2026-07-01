import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api-server';
import type { ModuleSummary } from '@/lib/types';

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main style={{ padding: 'var(--space-5) var(--space-4)' }}>
        <p>
          <Link href="/login">Sign in</Link> to see your library.
        </p>
      </main>
    );
  }

  const res = await apiFetchServer('/library');
  const modules: ModuleSummary[] = res.ok ? await res.json() : [];

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 1100, margin: '0 auto' }}>
      <h1>Your Library</h1>
      {modules.length === 0 ? (
        <p style={{ color: 'var(--color-text-dim)' }}>
          Nothing yet — <Link href="/">browse the catalog</Link> and unlock an app.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
          {modules.map((m) => (
            <Link key={m.slug} href={`/modules/${m.slug}`} className="card">
              <span style={{ fontSize: 24 }}>{m.icon}</span>
              <strong style={{ display: 'block', marginTop: 4 }}>{m.name}</strong>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>{m.description}</p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
