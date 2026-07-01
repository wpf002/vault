import Link from 'next/link';
import { WaitlistForm } from '@/components/WaitlistForm';
import { categoryAccent, categoryIcon } from '@/lib/category-theme';
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
  const liveCount = modules.filter((m) => m.status === 'live').length;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-4)' }}>
      <div className="hero">
        <h1>Every app you need. One vault.</h1>
        <p>
          {modules.length} mini-apps under one roof — {liveCount} live today, the rest on the way. Browse and try
          anything free. Buy one, or subscribe for all-access.
        </p>
        <button className="primary">Get all-access</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 'var(--space-4) 0' }}>
        <Link href="/">
          <button className={`pill ${!searchParams.category ? 'active' : ''}`}>All</button>
        </Link>
        {categories.map((c) => (
          <Link key={c} href={`/?category=${c}`}>
            <button className={`pill ${searchParams.category === c ? 'active' : ''}`}>
              {categoryIcon(c)} {c.replace(/_/g, ' ')}
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
        {filtered.map((m) => {
          const accent = categoryAccent(m.category);
          return (
            <div
              key={m.slug}
              className="product-card"
              style={{ '--card-accent': accent } as React.CSSProperties}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div className="icon">{categoryIcon(m.category)}</div>
                <span className={`badge ${m.status}`}>{m.status.replace('_', ' ')}</span>
              </div>
              <Link href={`/modules/${m.slug}`} style={{ fontWeight: 700, fontSize: 16 }}>
                {m.name}
              </Link>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: 0, flex: 1 }}>{m.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
                  {m.priceCents != null ? `$${(m.priceCents / 100).toFixed(2)}` : ''}
                </span>
                {m.status === 'live' ? (
                  <Link href={`/modules/${m.slug}`}>
                    <button className="pill active" style={{ background: accent }}>
                      Get
                    </button>
                  </Link>
                ) : null}
              </div>
              {m.status !== 'live' && <WaitlistForm slug={m.slug} />}
            </div>
          );
        })}
      </div>
    </main>
  );
}
