'use client';

import { useEffect, useState } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { createStoreClient, type ModuleManifest, type ModuleMode, type StoreClient } from '@vault/module-sdk';
import { apiFetch } from '@/lib/api';
import { MODULE_REGISTRY } from '@/lib/module-registry';
import { BuyWall } from '@/components/BuyWall';

type Props = { slug: string; name: string; priceCents: number | null };

/**
 * The gating wrapper every live module renders through. Decides preview vs
 * full from a real access check (never trusts the client beyond that), and
 * hands the module a store client that's ephemeral in preview or backed by
 * the real API in full — the module component itself never checks access.
 */
export function ModuleRuntime({ slug, name, priceCents }: Props) {
  const { status } = useSession();
  const [mode, setMode] = useState<ModuleMode | 'loading'>('loading');
  const [manifest, setManifest] = useState<ModuleManifest | 'missing' | null>(null);
  const [buyWallOpen, setBuyWallOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authenticated') return setMode('preview');
    apiFetch(`/modules/${slug}/access`)
      .then((r) => r.json())
      .then((body) => setMode(body.access ? 'full' : 'preview'))
      .catch(() => setMode('preview'));
  }, [status, slug]);

  useEffect(() => {
    const load = MODULE_REGISTRY[slug];
    if (!load) return setManifest('missing');
    load().then((m) => setManifest(m.default));
  }, [slug]);

  if (manifest === 'missing') {
    return (
      <div className="card">
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
          Not built yet in this shell — the catalog lists it, but its module folder doesn't exist. Comes online via
          the Phase 5 generator.
        </p>
      </div>
    );
  }

  if (mode === 'loading' || manifest === null) return <div className="card">Loading…</div>;

  const store: StoreClient =
    mode === 'preview'
      ? createStoreClient({ mode, moduleSlug: slug, seed: manifest.seedPreview?.() ?? {} })
      : createStoreClient({
          mode,
          moduleSlug: slug,
          apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
          getToken: async () => (await getSession())?.apiToken,
        });

  const Component = manifest.Component;
  const accent = manifest.theme?.accent;

  return (
    <div style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}>
      {mode === 'preview' && (
        <p style={{ color: 'var(--color-text-dim)', fontSize: 12, marginBottom: 8 }}>
          Preview — try everything free. Saving is ephemeral until you unlock this app.
        </p>
      )}
      <Component mode={mode} store={store} requestUpgrade={() => setBuyWallOpen(true)} />
      <BuyWall
        open={buyWallOpen}
        onClose={() => setBuyWallOpen(false)}
        moduleSlug={slug}
        moduleName={name}
        priceCents={priceCents}
      />
    </div>
  );
}
