import Link from 'next/link';
import { WaitlistForm } from '@/components/WaitlistForm';
import type { ModuleSummary } from '@/lib/types';

async function getModules(): Promise<ModuleSummary[]> {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/modules`;
  const res = await fetch(url, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return [];
  return res.json();
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const modules = await getModules();
  const categories = Array.from(new Set(modules.map((m) => m.category))).sort();
  const filtered = searchParams.category
    ? modules.filter((m) => m.category === searchParams.category)
    : modules;

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 4 }}>vault</h1>
      <p style={{ color: 'var(--color-text-dim)', marginTop: 0 }}>
        {modules.length} mini-apps under one roof. Browse and preview free — buy one, or subscribe to all.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 'var(--space-3) 0' }}>
        <Link href="/">
          <button className={!searchParams.category ? 'primary' : undefined}>All</button>
        </Link>
        {categories.map((c) => (
          <Link key={c} href={`/?category=${c}`}>
            <button className={searchParams.category === c ? 'primary' : undefined}>
              {c.replace(/_/g, ' ')}
            </button>
          </Link>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        {filtered.map((m) => (
          <div key={m.slug} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Link href={`/modules/${m.slug}`} style={{ fontWeight: 600 }}>
                {m.name}
              </Link>
              <span className={`badge ${m.status}`}>{m.status.replace('_', ' ')}</span>
            </div>
            <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: 0 }}>{m.description}</p>
            <div style={{ marginTop: 'auto' }}>
              {m.status === 'live' ? (
                <Link href={`/modules/${m.slug}`}>
                  <button className="primary">Launch demo</button>
                </Link>
              ) : (
                <WaitlistForm slug={m.slug} />
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
