'use client';

import { useEffect, useState } from 'react';
import { useSession, getSession } from 'next-auth/react';
import { createAiClient, createStoreClient, type ModuleManifest, type ModuleMode, type StoreClient } from '@vault/module-sdk';
import { apiFetch } from '@/lib/api';
import { MODULE_REGISTRY } from '@/lib/module-registry';
import { AccountPrompt } from '@/components/AccountPrompt';

type Props = { slug: string; name: string };

/**
 * The gating wrapper every live module renders through. With the vault
 * sold as one product, the split is simply signed-out (ephemeral demo
 * data) vs. signed-in (real persistence + AI) — the server still makes
 * that call per request, the client mode prop is UX only.
 */
export function ModuleRuntime({ slug, name }: Props) {
  const { status } = useSession();
  const [mode, setMode] = useState<ModuleMode | 'loading'>('loading');
  const [manifest, setManifest] = useState<ModuleManifest | 'missing' | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

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

  // Always server-backed, in both modes — the server owns the provider key
  // and the preview allowance. Signed-out users get sign_in_required from
  // the client itself without a request.
  const ai = createAiClient({
    moduleSlug: slug,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
    getToken: async () => (await getSession())?.apiToken,
  });

  const Component = manifest.Component;
  const accent = manifest.theme?.accent;

  return (
    <div style={accent ? ({ '--module-accent': accent } as React.CSSProperties) : undefined}>
      <Component mode={mode} store={store} ai={ai} requestUpgrade={() => setPromptOpen(true)} />
      <AccountPrompt open={promptOpen} onClose={() => setPromptOpen(false)} moduleName={name} />
    </div>
  );
}
