'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { apiFetch } from '@/lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  moduleSlug: string;
  moduleName: string;
  priceCents: number | null;
};

/**
 * The single buy-wall UI, reused everywhere a gated action is blocked.
 * Free to look, pay to keep — this is what fires when a preview user tries
 * to persist/export (Phase 4 wires the trigger; this component is the UI).
 */
export function BuyWall({ open, onClose, moduleSlug, moduleName, priceCents }: Props) {
  const { status } = useSession();
  const [loading, setLoading] = useState<'sub' | 'module' | null>(null);

  if (!open) return null;

  async function checkout(kind: 'sub' | 'module') {
    if (status !== 'authenticated') return signIn();
    setLoading(kind);
    const path = kind === 'sub' ? '/billing/checkout/subscription' : `/billing/checkout/module/${moduleSlug}`;
    const res = await apiFetch(path, { method: 'POST' });
    const body = await res.json().catch(() => null);
    setLoading(null);
    if (body?.url) window.location.href = body.url;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, width: '90%' }}>
        <h3 style={{ marginTop: 0 }}>Keep using {moduleName}</h3>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13 }}>
          Anyone can try this module free. Saving, exporting, and persisting your data needs an unlock.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="primary" onClick={() => checkout('sub')} disabled={loading !== null}>
            {loading === 'sub' ? 'Redirecting…' : 'Subscribe — unlock everything'}
          </button>
          {priceCents != null && (
            <button onClick={() => checkout('module')} disabled={loading !== null}>
              {loading === 'module' ? 'Redirecting…' : `Buy just this app — $${(priceCents / 100).toFixed(2)}`}
            </button>
          )}
          <button onClick={onClose}>Not now</button>
        </div>
      </div>
    </div>
  );
}
