import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Browser Cookie Manager — paste a site's cookie list (straight from
// devtools or a consent dialog) and the AI classifies each one:
// essential / functional / analytics / advertising, what it actually
// does in plain English, and a keep-or-block verdict. Audits persist per
// site so you build a privacy ledger. Scope note: actually
// deleting/blocking cookies requires a browser extension — this is the
// judgment layer that tells you WHAT to block. CONTRACT.md #11 rendered.

type CookieRow = { name: string; classification: 'essential' | 'functional' | 'analytics' | 'advertising'; note: string; verdict: 'keep' | 'block' };
type Audit = { site: string; cookies: CookieRow[] };

const SYSTEM_PROMPT = [
  'You are a privacy analyst classifying browser cookies. For each numbered cookie name output exactly one line:',
  'N | ESSENTIAL or FUNCTIONAL or ANALYTICS or ADVERTISING | plain-English note on what it does | KEEP or BLOCK',
  'Well-known trackers (_ga, fbp, _gcl, doubleclick, hotjar etc.) should be identified by name. Unknown cookies: classify from naming conventions and say so.',
  'ESSENTIAL and FUNCTIONAL are usually KEEP; ANALYTICS and ADVERTISING usually BLOCK. No headers, no commentary.',
].join(' ');

const CLASS_META: Record<CookieRow['classification'], { icon: string; color: string }> = {
  essential: { icon: '🔒', color: '#39d98a' },
  functional: { icon: '⚙️', color: '#93c5fd' },
  analytics: { icon: '📊', color: '#f5c451' },
  advertising: { icon: '🎯', color: '#ff6b5e' },
};

function parseCookies(text: string, names: string[]): CookieRow[] {
  const rows: CookieRow[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.includes('|')) continue;
    const parts = line.split('|').map((p) => p.trim());
    const idx = Number(parts[0]) - 1;
    const cls = parts[1]?.toLowerCase();
    const verdict = parts[3]?.toLowerCase();
    if (idx >= 0 && idx < names.length && (cls === 'essential' || cls === 'functional' || cls === 'analytics' || cls === 'advertising')) {
      rows.push({ name: names[idx]!, classification: cls, note: parts[2] || '—', verdict: verdict === 'block' ? 'block' : 'keep' });
    }
  }
  return rows;
}

export function AIBrowserCookieManager({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [audits, setAudits] = useState<StoreDoc<Audit>[] | null>(null);
  const [site, setSite] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Audit>('audits').then(setAudits);
  }, [store]);

  const auditList = audits ?? [];
  const allCookies = auditList.flatMap((a) => a.data.cookies);
  const blockCount = allCookies.filter((c) => c.verdict === 'block').length;

  async function audit() {
    if (!ai || working || !site.trim()) return;
    const names = cookieInput.split(/[\n,]/).map((n) => n.trim()).filter(Boolean).slice(0, 30);
    if (names.length === 0) return;
    setWorking(true);
    setFailure(null);
    const numbered = names.map((n, i) => `${i + 1}. ${n}`).join('\n');
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Cookies set by ${site.trim()}:\n${numbered}` });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const cookies = parseCookies(res.text, names);
    if (cookies.length === 0) return;
    const doc = await store.create('audits', { site: site.trim(), cookies });
    setAudits((prev) => [doc, ...(prev ?? [])]);
    setSite('');
    setCookieInput('');
  }

  async function removeAudit(docId: string) {
    await store.remove('audits', docId);
    setAudits((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  function exportLedger() {
    const rows = auditList.flatMap((a) => a.data.cookies.map((c) => `${a.data.site},${c.name},${c.classification},${c.verdict},"${c.note.replace(/"/g, '""')}"`));
    const csv = ['site,cookie,classification,verdict,note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookie-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (audits === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="browser-cookie-manager-root">
      <Section title="Audit a Site">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ width: 200 }}>
              <Label>Site</Label>
              <Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="e.g. shop.example.com" data-testid="site-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={audit} data-testid="audit-button" disabled={working || !site.trim() || !cookieInput.trim()}>
              {working ? '🍪 Classifying…' : '🍪 Classify Cookies'}
            </Button>
          </div>
          <div>
            <Label>Cookie Names (From Devtools — Comma or Newline Separated)</Label>
            <Textarea value={cookieInput} onChange={(e) => setCookieInput(e.target.value)} placeholder={'session_id\n_ga\nfbp\ncart_token'} data-testid="cookies-input" rows={3} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'audit' : 'audits'} left in preview — unlock the app for unlimited audits.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Audits need an account, even to try — sign in for a few free ones.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free audits are used up — unlock the app to keep auditing.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The classifier is offline right now — try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Privacy Ledger">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={auditList.length} label="Sites audited" />
          <StatDisplay value={allCookies.length} label="Cookies classified" />
          <StatDisplay value={<span data-testid="block-count" style={{ color: blockCount > 0 ? '#ff6b5e' : undefined }}>{blockCount}</span>} label="Recommended blocks" />
        </div>

        {auditList.length === 0 ? (
          <EmptyState icon="🍪">No audits yet — paste a site's cookies above.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }} data-testid="audits-list">
            {auditList.map((a) => (
              <div key={a.docId} data-testid="audit-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Label>🌐 {a.data.site}</Label>
                  <span style={{ flex: 1 }} />
                  <IconButton label="Remove" onClick={() => removeAudit(a.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {a.data.cookies.map((c, i) => (
                    <div key={i} className="module-list-row" data-testid="cookie-item" style={{ alignItems: 'center' }}>
                      <span style={{ minWidth: 24 }}>{CLASS_META[c.classification].icon}</span>
                      <div className="module-list-row-content" style={{ flex: 1 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{c.name}</span>
                        <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{c.note}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: CLASS_META[c.classification].color, textTransform: 'uppercase' }}>{c.classification}</span>
                      <Tag active={c.verdict === 'block'}>{c.verdict === 'block' ? '🚫 Block' : '✓ Keep'}</Tag>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLedger}>
          ⬇️ Export Ledger as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
