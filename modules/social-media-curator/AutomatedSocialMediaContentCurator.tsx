import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Automated Social Media Content Curator — set the brand voice once,
// then generate a week of posts through the proxy in strict
// DAY | HOOK | POST | HASHTAGS lines that land on a content calendar as
// drafts you advance (draft → scheduled → posted). Scope note: actually
// publishing needs per-platform API integrations — the generation and
// calendar workflow are the substance. CONTRACT.md #11 states rendered.

type Brand = { business: string; voice: string; audience: string };
type Post = { day: string; hook: string; body: string; hashtags: string; status: 'draft' | 'scheduled' | 'posted' };

const SYSTEM_PROMPT = [
  'You are a social media strategist. Generate posts for the given brand, one line each, exactly:',
  'DAY | HOOK (a scroll-stopping first line) | POST (2-3 sentences in the brand voice) | HASHTAGS (3-4, space-separated with #)',
  'Vary the content types across the week: a tip, something behind-the-scenes, product/craft love, community. Never sound like an ad.',
  'No headers, no numbering, no commentary.',
].join(' ');

const STATUS_FLOW: Post['status'][] = ['draft', 'scheduled', 'posted'];
const STATUS_LABELS: Record<Post['status'], string> = { draft: '📝 Draft', scheduled: '🗓️ Scheduled', posted: '✅ Posted' };

function parsePosts(text: string): Post[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.split('|').length >= 4)
    .map((line) => {
      const [day = '', hook = '', body = '', hashtags = ''] = line.split('|').map((p) => p.trim());
      return { day, hook, body, hashtags, status: 'draft' as const };
    })
    .filter((p) => p.hook && p.body);
}

export function AutomatedSocialMediaContentCurator({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [brand, setBrand] = useState<StoreDoc<Brand> | null | undefined>(undefined);
  const [posts, setPosts] = useState<StoreDoc<Post>[] | null>(null);
  const [draft, setDraft] = useState<Brand>({ business: '', voice: '', audience: '' });
  const [editing, setEditing] = useState(false);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Brand>('brand').then((docs) => setBrand(docs[0] ?? null));
    store.list<Post>('posts').then(setPosts);
  }, [store]);

  const b = brand?.data;
  const postList = posts ?? [];

  async function saveBrand() {
    if (!draft.business.trim()) return;
    if (brand) {
      const updated = await store.update('brand', brand.docId, draft);
      setBrand(updated);
    } else {
      const doc = await store.create('brand', draft);
      setBrand(doc);
    }
    setEditing(false);
  }

  async function generateWeek() {
    if (!ai || working || !b) return;
    setWorking(true);
    setFailure(null);
    const recent = postList.slice(0, 6).map((p) => p.data.hook).join('; ');
    const prompt = [
      `Brand: ${b.business}. Voice: ${b.voice}. Audience: ${b.audience}.`,
      `Generate 5 posts for next week (Monday to Friday).`,
      recent ? `Avoid repeating these recent hooks: ${recent}.` : '',
    ].join(' ');
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt, maxTokens: 800 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const parsed = parsePosts(res.text);
    const created: StoreDoc<Post>[] = [];
    for (const p of parsed) created.push(await store.create('posts', p));
    setPosts((prev) => [...created, ...(prev ?? [])]);
  }

  async function advancePost(doc: StoreDoc<Post>) {
    const idx = STATUS_FLOW.indexOf(doc.data.status);
    if (idx >= STATUS_FLOW.length - 1) return;
    const next: Post = { ...doc.data, status: STATUS_FLOW[idx + 1]! };
    const updated = await store.update('posts', doc.docId, next);
    setPosts((prev) => (prev ?? []).map((p) => (p.docId === doc.docId ? updated : p)));
  }

  async function removePost(docId: string) {
    await store.remove('posts', docId);
    setPosts((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportCalendar() {
    const lines = postList.map((p) => `## ${p.data.day} — ${p.data.hook} (${p.data.status})\n\n${p.data.body}\n\n${p.data.hashtags}`);
    const md = ['# Content Calendar', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'content-calendar.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (brand === undefined || posts === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="social-media-curator-root">
      <Section title="Brand Voice">
        {b && !editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid="brand-summary">
            <Tag active>🏪 {b.business}</Tag>
            <Tag>🗣️ {b.voice.slice(0, 40)}{b.voice.length > 40 ? '…' : ''}</Tag>
            <Tag>👥 {b.audience.slice(0, 40)}{b.audience.length > 40 ? '…' : ''}</Tag>
            <Button variant="ghost" onClick={() => { setDraft(b); setEditing(true); }} data-testid="edit-brand-button" style={{ padding: '5px 10px', fontSize: 12 }}>
              ✏️ Edit
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="brand-editor">
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Business</Label>
                <Input value={draft.business} onChange={(e) => setDraft({ ...draft, business: e.target.value })} placeholder="e.g. Fernwood Coffee" data-testid="business-input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <Label>Voice</Label>
                <Input value={draft.voice} onChange={(e) => setDraft({ ...draft, voice: e.target.value })} placeholder="e.g. Warm, nerdy, never salesy" data-testid="voice-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Label>Audience</Label>
                <Input value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} placeholder="Who you're talking to" data-testid="audience-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={saveBrand} data-testid="save-brand-button">
                💾 Save
              </Button>
            </div>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Generate Content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={generateWeek} data-testid="generate-button" disabled={working || !b}>
              {working ? '📱 Writing the week…' : '📱 Generate a Week of Posts'}
            </Button>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Auto-publishing needs platform APIs — you post from the calendar.</span>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'generation' : 'generations'} left in preview — unlock the app for a full pipeline.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The curator needs an account, even to try it — sign in for a few free generations.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free generations are used up — unlock the app to fill the calendar.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The curator is offline right now — your calendar is intact, try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Content Calendar">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="post-count">{postList.length}</span>} label="Posts" />
          <StatDisplay value={postList.filter((p) => p.data.status === 'draft').length} label="Drafts" />
          <StatDisplay value={postList.filter((p) => p.data.status === 'scheduled').length} label="Scheduled" />
          <StatDisplay value={postList.filter((p) => p.data.status === 'posted').length} label="Posted" />
        </div>

        {postList.length === 0 ? (
          <EmptyState icon="📱">Empty calendar — generate a week above.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="posts-list">
            {postList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="post-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Tag>{p.data.day}</Tag>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.hook}</span>
                  </div>
                  <Tag active={p.data.status === 'posted'} data-testid={`status-${p.docId}`}>
                    {STATUS_LABELS[p.data.status]}
                  </Tag>
                  {p.data.status !== 'posted' && (
                    <Button variant="secondary" onClick={() => advancePost(p)} data-testid={`advance-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      → {STATUS_LABELS[STATUS_FLOW[STATUS_FLOW.indexOf(p.data.status) + 1]!].split(' ')[1]}
                    </Button>
                  )}
                  <IconButton label="Remove" onClick={() => removePost(p.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-dim)', marginLeft: 4 }}>
                  {p.data.body}
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--module-accent)' }}>{p.data.hashtags}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCalendar}>
          ⬇️ Export Calendar as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
