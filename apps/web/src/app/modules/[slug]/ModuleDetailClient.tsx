'use client';

import { WaitlistForm } from '@/components/WaitlistForm';
import { ModuleRuntime } from '@/components/ModuleRuntime';
import { statusLabel } from '@/lib/category-theme';
import type { ModuleSummary } from '@/lib/types';

export function ModuleDetailClient({ module }: { module: ModuleSummary }) {
  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <span style={{ fontSize: 40 }}>{module.icon}</span>
        <span className={`badge ${module.status}`}>{statusLabel(module.status)}</span>
      </div>
      <h1 style={{ marginBottom: 4 }}>{module.name}</h1>
      <p style={{ color: 'var(--color-text-dim)' }}>{module.description}</p>
      {module.priceCents != null && (
        <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>
          ${(module.priceCents / 100).toFixed(2)} one-time, or included in the all-access subscription.
        </p>
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
