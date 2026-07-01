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
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: '90%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: 'var(--space-4)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Keep Using {moduleName}</h3>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginTop: 0 }}>
          Anyone can try this free. Saving, exporting, and persisting your data needs an unlock.
        </p>

        <div
          style={{
            borderRadius: 16,
            padding: 2,
            background: 'var(--gradient-accent)',
            margin: '16px 0 10px',
          }}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 14, padding: 16 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--color-accent-2)',
              }}
            >
              Best Value
            </span>
            <div style={{ fontWeight: 700, fontSize: 17, margin: '4px 0 12px' }}>
              All-Access Subscription — Every App, Unlimited
            </div>
            <button className="primary" style={{ width: '100%' }} onClick={() => checkout('sub')} disabled={loading !== null}>
              {loading === 'sub' ? 'Redirecting…' : 'Subscribe'}
            </button>
          </div>
        </div>

        {priceCents != null && (
          <button style={{ width: '100%', marginBottom: 8 }} onClick={() => checkout('module')} disabled={loading !== null}>
            {loading === 'module' ? 'Redirecting…' : `Buy Just This App — $${(priceCents / 100).toFixed(2)}`}
          </button>
        )}
        <button style={{ width: '100%', background: 'transparent', border: 'none' }} onClick={onClose}>
          Not Now
        </button>
      </div>
    </div>
  );
}
