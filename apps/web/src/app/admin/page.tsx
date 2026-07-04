'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

// Phase 8 — the operator console. Launching a module is the Live button,
// price and copy edit inline, and the waitlist column is the build-next
// demand signal. This is platform chrome, so it uses the shell's own
// accent (not a module accent). Server-side authz is ADMIN_EMAILS on the
// API — this page just renders the 403 politely.

type AdminModule = {
  slug: string;
  number: number;
  name: string;
  icon: string;
  status: 'coming_soon' | 'live' | 'retired';
  priceCents: number | null;
  requiresAi: boolean;
  waitlistCount: number;
  purchaseCount: number;
};

type Overview = {
  users: number;
  purchases: number;
  revenueCents: number;
  activeSubscriptions: number;
  ai: { calls: number; inputTokens: number; outputTokens: number };
  topWaitlist: { module: { name: string; slug: string } | null; signups: number }[];
  topPurchased: { module: { name: string; slug: string } | null; purchases: number }[];
};

const STATUS_META: Record<AdminModule['status'], { label: string; color: string }> = {
  live: { label: 'Live', color: '#39d98a' },
  coming_soon: { label: 'Coming Soon', color: '#f5c451' },
  retired: { label: 'Retired', color: '#8b8b94' },
};

function fmt(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}

export default function AdminPage() {
  const { status: sessionStatus } = useSession();
  const [state, setState] = useState<'loading' | 'forbidden' | 'ready'>('loading');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [modules, setModules] = useState<AdminModule[]>([]);
  const [filter, setFilter] = useState<'all' | AdminModule['status']>('all');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);

  async function load() {
    const [ovRes, modRes] = await Promise.all([apiFetch('/admin/overview'), apiFetch('/admin/modules')]);
    if (ovRes.status === 401 || ovRes.status === 403) {
      setState('forbidden');
      return;
    }
    setOverview(await ovRes.json());
    setModules(await modRes.json());
    setState('ready');
  }

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus !== 'authenticated') {
      setState('forbidden');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  async function patchModule(slug: string, body: Record<string, unknown>) {
    setBusySlug(slug);
    const res = await apiFetch(`/admin/modules/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setModules((prev) => prev.map((m) => (m.slug === slug ? { ...m, ...updated } : m)));
    }
    setBusySlug(null);
  }

  async function savePrice(m: AdminModule) {
    const draft = priceDrafts[m.slug];
    if (draft === undefined || draft === '') return;
    const priceCents = Math.round(Number(draft) * 100);
    if (!Number.isInteger(priceCents) || priceCents < 0) return;
    await patchModule(m.slug, { priceCents });
    setPriceDrafts((prev) => ({ ...prev, [m.slug]: '' }));
  }

  if (state === 'loading') {
    return (
      <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 1100, margin: '0 auto' }}>
        <p style={{ color: 'var(--color-text-dim)' }}>Loading the console…</p>
      </main>
    );
  }

  if (state === 'forbidden') {
    return (
      <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 1100, margin: '0 auto' }} data-testid="admin-forbidden">
        <h1>Admin</h1>
        <p style={{ color: 'var(--color-text-dim)' }}>
          This console is for operators. Sign in with an admin account (set via <code>ADMIN_EMAILS</code> on the API), or head{' '}
          <Link href="/">back to the catalog</Link>.
        </p>
      </main>
    );
  }

  const shown = modules.filter((m) => filter === 'all' || m.status === filter);
  const liveCount = modules.filter((m) => m.status === 'live').length;

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 1100, margin: '0 auto' }} data-testid="admin-console">
      <h1>Operator Console</h1>

      {overview && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-3)', margin: 'var(--space-4) 0' }} data-testid="admin-metrics">
          <div className="card">
            <div style={{ fontSize: 26, fontWeight: 800 }} data-testid="metric-revenue">{fmt(overview.revenueCents)}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Revenue · {overview.purchases} purchases</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 26, fontWeight: 800 }}>{overview.activeSubscriptions}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Active Subscriptions</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 26, fontWeight: 800 }} data-testid="metric-users">{overview.users}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Users</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 26, fontWeight: 800 }} data-testid="metric-live">{liveCount}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Modules Live of {modules.length}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: 26, fontWeight: 800 }}>{overview.ai.calls}</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>
              AI Calls · {Math.round((overview.ai.inputTokens + overview.ai.outputTokens) / 1000)}k tokens
            </div>
          </div>
        </section>
      )}

      {overview && (overview.topWaitlist.length > 0 || overview.topPurchased.length > 0) && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div className="card" data-testid="top-waitlist">
            <strong>Build-Next Signal (Waitlist)</strong>
            {overview.topWaitlist.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>No waitlist signups yet.</p>
            ) : (
              overview.topWaitlist.map((w, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span>{w.module?.name ?? 'Unknown'}</span>
                  <span style={{ color: 'var(--color-accent)' }}>{w.signups}</span>
                </div>
              ))
            )}
          </div>
          <div className="card" data-testid="top-purchased">
            <strong>Top Sellers</strong>
            {overview.topPurchased.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>No purchases yet.</p>
            ) : (
              overview.topPurchased.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span>{t.module?.name ?? 'Unknown'}</span>
                  <span style={{ color: 'var(--color-accent)' }}>{t.purchases}</span>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, flex: 1 }}>Catalog</h2>
          {(['all', 'live', 'coming_soon', 'retired'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`filter-${f}`}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontSize: 12,
                border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                background: filter === f ? 'var(--color-accent)' : 'transparent',
                color: filter === f ? '#0b0b10' : 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? `All (${modules.length})` : `${STATUS_META[f].label} (${modules.filter((m) => m.status === f).length})`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="admin-modules-list">
          {shown.map((m) => (
            <div key={m.slug} className="card" data-testid={`admin-module-${m.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px' }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <strong style={{ fontSize: 14 }}>
                  #{m.number} {m.name}
                </strong>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                  {m.priceCents !== null ? fmt(m.priceCents) : 'No price'} · 📋 {m.waitlistCount} waitlisted · 💰 {m.purchaseCount} sold
                  {m.requiresAi ? ' · 🤖 AI' : ''}
                </div>
              </div>

              <span style={{ fontSize: 12, fontWeight: 700, color: STATUS_META[m.status].color, minWidth: 90 }} data-testid={`status-${m.slug}`}>
                ● {STATUS_META[m.status].label}
              </span>

              <span style={{ display: 'inline-flex', gap: 4 }}>
                {(['live', 'coming_soon', 'retired'] as const)
                  .filter((s) => s !== m.status)
                  .map((s) => (
                    <button
                      key={s}
                      onClick={() => patchModule(m.slug, { status: s })}
                      disabled={busySlug === m.slug}
                      data-testid={`set-${s}-${m.slug}`}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: 12,
                        border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                        background: s === 'live' ? 'var(--color-accent)' : 'transparent',
                        color: s === 'live' ? '#0b0b10' : 'var(--color-text)',
                        cursor: 'pointer',
                        opacity: busySlug === m.slug ? 0.5 : 1,
                      }}
                    >
                      {s === 'live' ? '🚀 Go Live' : STATUS_META[s].label}
                    </button>
                  ))}
              </span>

              <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="number"
                  value={priceDrafts[m.slug] ?? ''}
                  onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [m.slug]: e.target.value }))}
                  placeholder="$"
                  data-testid={`price-input-${m.slug}`}
                  style={{
                    width: 70,
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 12,
                    border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                    background: 'transparent',
                    color: 'var(--color-text)',
                  }}
                />
                <button
                  onClick={() => savePrice(m)}
                  disabled={busySlug === m.slug || !priceDrafts[m.slug]}
                  data-testid={`save-price-${m.slug}`}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    border: '1px solid var(--color-border, rgba(255,255,255,0.12))',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Set Price
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
