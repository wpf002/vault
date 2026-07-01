'use client';

import Link from 'next/link';
import { WaitlistForm } from '@/components/WaitlistForm';
import { ModuleRuntime } from '@/components/ModuleRuntime';
import { categoryAccent, statusLabel } from '@/lib/category-theme';
import type { ModuleSummary } from '@/lib/types';

export function ModuleDetailClient({ module }: { module: ModuleSummary }) {
  const accent = categoryAccent(module.category);

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 700, margin: '0 auto' }}>
      <Link href="/" className="breadcrumb-link">
        ← Catalog
      </Link>

      <div className="detail-header" style={{ '--card-accent': accent } as React.CSSProperties}>
        <div className="detail-icon-badge">{module.icon}</div>
        <div>
          <div className="detail-title-row">
            <h1>{module.name}</h1>
            <span className={`badge ${module.status}`}>{statusLabel(module.status)}</span>
          </div>
          <p className="detail-description">{module.description}</p>
        </div>
      </div>

      {module.priceCents != null && (
        <div className="price-panel" style={{ '--card-accent': accent } as React.CSSProperties}>
          <div>
            <span className="price">${(module.priceCents / 100).toFixed(2)}</span>{' '}
            <span className="note">one-time unlock</span>
          </div>
          <span className="note">or included in All-Access</span>
        </div>
      )}

      {module.status !== 'live' ? (
        <div className="card" style={{ maxWidth: 320 }}>
          <p style={{ marginTop: 0 }}>Not built yet — get notified when it ships.</p>
          <WaitlistForm slug={module.slug} />
        </div>
      ) : (
        <ModuleRuntime slug={module.slug} name={module.name} priceCents={module.priceCents} />
      )}
    </main>
  );
}
