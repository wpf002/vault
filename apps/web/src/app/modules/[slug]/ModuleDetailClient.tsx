'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch } from '@/lib/api';
import { WaitlistForm } from '@/components/WaitlistForm';
import { BuyWall } from '@/components/BuyWall';
import type { ModuleSummary } from '@/lib/types';

export function ModuleDetailClient({ module }: { module: ModuleSummary }) {
  const { status } = useSession();
  const [access, setAccess] = useState(false);
  const [buyWallOpen, setBuyWallOpen] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || module.status !== 'live') return;
    apiFetch(`/modules/${module.slug}/access`)
      .then((r) => r.json())
      .then((body) => setAccess(Boolean(body.access)))
      .catch(() => setAccess(false));
  }, [status, module.slug, module.status]);

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 700, margin: '0 auto' }}>
      <span className={`badge ${module.status}`}>{module.status.replace('_', ' ')}</span>
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
        <div className="card">
          <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
            {/* The real module UI mounts here once Phase 4 (module runtime) ships. */}
            Demo placeholder — the module runtime that mounts real app UI in preview/full mode lands in Phase 4.
          </p>
          <button className="primary" onClick={() => setBuyWallOpen(true)}>
            {access ? 'Save (entitled)' : 'Try saving — hits the buy wall'}
          </button>
        </div>
      )}

      <BuyWall
        open={buyWallOpen}
        onClose={() => setBuyWallOpen(false)}
        moduleSlug={module.slug}
        moduleName={module.name}
        priceCents={module.priceCents}
      />
    </main>
  );
}
