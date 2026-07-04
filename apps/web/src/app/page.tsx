import Link from 'next/link';
import { WaitlistForm } from '@/components/WaitlistForm';
import { categoryAccent, categoryIcon, categoryLabel } from '@/lib/category-theme';
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
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--space-4)' }}>
      <div className="hero">
        <h1>Every App You Need. One Vault.</h1>
        <p>{modules.length} mini-apps under one roof. Open any of them and start — your account unlocks everything.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: 'var(--space-4) 0' }}>
        <Link href="/">
          <button className={`pill ${!searchParams.category ? 'active' : ''}`}>All</button>
        </Link>
        {categories.map((c) => (
          <Link key={c} href={`/?category=${c}`}>
            <button className={`pill ${searchParams.category === c ? 'active' : ''}`}>
              {categoryIcon(c)} {categoryLabel(c)}
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
            <Link
              key={m.slug}
              href={`/modules/${m.slug}`}
              className="product-card"
              style={{ '--card-accent': accent } as React.CSSProperties}
            >
              <div className="icon">{m.icon}</div>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{m.name}</span>
              <p style={{ color: 'var(--color-text-dim)', fontSize: 13, margin: 0, flex: 1 }}>{m.description}</p>
              {m.status !== 'live' && <WaitlistForm slug={m.slug} />}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
