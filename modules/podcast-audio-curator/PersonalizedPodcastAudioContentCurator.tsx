import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Personalized Podcast & Audio Content Curator — the "learns your
// habits" part is your listening log (loved / fine / dropped verdicts);
// curation sends that log to the AI proxy and asks for picks in a strict
// TITLE | WHY | TOPIC line format, so every recommendation is grounded
// in what you actually finished vs. abandoned. Picks you like go to the
// listen queue. CONTRACT.md #11 failure states rendered.

type LogEntry = { show: string; topic: string; verdict: 'loved' | 'fine' | 'dropped' };
type QueueItem = { title: string; why: string; topic: string };

const VERDICT_META: Record<LogEntry['verdict'], string> = { loved: '❤️ Loved', fine: '🙂 Fine', dropped: '⏭️ Dropped' };

function buildPrompt(log: LogEntry[]): string {
  const lines = log.map((l) => `${l.verdict.toUpperCase()}: "${l.show}" (${l.topic})`);
  return `My listening log:\n${lines.join('\n')}\n\nRecommend 5 podcasts or audio shows I haven't logged. Weight LOVED heavily, avoid anything like DROPPED.`;
}

const SYSTEM_PROMPT = [
  'You are a podcast curator. Output ONLY recommendation lines, one per line, exactly:',
  'TITLE | WHY (one sentence tied to their log) | TOPIC',
  'Real, well-known shows only. No headers, no numbering, no commentary.',
].join(' ');

function parsePicks(text: string): QueueItem[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes('|'))
    .map((line) => {
      const [title = '', why = '', topic = 'Audio'] = line.split('|').map((p) => p.trim());
      return { title, why, topic };
    })
    .filter((p) => p.title.length > 0);
}

export function PersonalizedPodcastAudioContentCurator({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [log, setLog] = useState<StoreDoc<LogEntry>[] | null>(null);
  const [queue, setQueue] = useState<StoreDoc<QueueItem>[] | null>(null);
  const [show, setShow] = useState('');
  const [topic, setTopic] = useState('');
  const [verdict, setVerdict] = useState<LogEntry['verdict']>('loved');
  const [working, setWorking] = useState(false);
  const [picks, setPicks] = useState<QueueItem[] | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<LogEntry>('log').then(setLog);
    store.list<QueueItem>('queue').then(setQueue);
  }, [store]);

  const logList = log ?? [];
  const lovedCount = logList.filter((l) => l.data.verdict === 'loved').length;

  async function curate() {
    if (!ai || working || logList.length < 3) return;
    setWorking(true);
    setFailure(null);
    setPicks(null);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: buildPrompt(logList.map((l) => l.data)) });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setPicks(parsePicks(res.text));
  }

  async function addToQueue(pick: QueueItem) {
    const doc = await store.create('queue', pick);
    setQueue((prev) => [doc, ...(prev ?? [])]);
    setPicks((prev) => (prev ?? []).filter((p) => p.title !== pick.title));
  }

  async function addLog() {
    if (!show.trim()) return;
    const doc = await store.create('log', { show: show.trim(), topic: topic.trim() || 'General', verdict });
    setLog((prev) => [...(prev ?? []), doc]);
    setShow('');
    setTopic('');
  }

  async function removeLog(docId: string) {
    await store.remove('log', docId);
    setLog((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  async function removeQueued(docId: string) {
    await store.remove('queue', docId);
    setQueue((prev) => (prev ?? []).filter((q) => q.docId !== docId));
  }

  function exportQueue() {
    const lines = (queue ?? []).map((q) => `- **${q.data.title}** (${q.data.topic}) — ${q.data.why}`);
    const md = ['# Listen Queue', '', ...lines].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'listen-queue.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (log === null || queue === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="podcast-audio-curator-root">
      <Section title="Curate for Me">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={curate} data-testid="curate-button" disabled={working || logList.length < 3}>
              {working ? 'Curating…' : 'Recommend From My Log'}
            </Button>
            {logList.length < 3 && <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Log at least 3 shows so the curator has taste to work with.</span>}
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited use.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 AI needs an account, even to try it — sign in and you'll get a few free curations.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free AI calls are used up — unlock the app for unlimited curation.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 AI is offline right now — your log is safe, try again in a bit.
            </div>
          )}

          {picks && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="picks-panel">
              {picks.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>The curator came back empty — try again.</p>
              ) : (
                picks.map((p) => (
                  <div key={p.title} className="module-list-row" data-testid="pick-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.title}</span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{p.why}</div>
                    </div>
                    <Tag>{p.topic}</Tag>
                    <Button variant="secondary" onClick={() => addToQueue(p)} data-testid={`queue-${p.title.slice(0, 12).replace(/\W/g, '')}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      + Queue
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Listen Queue">
        {queue.length === 0 ? (
          <EmptyState icon="🎧">Queue is empty — curate some picks.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} data-testid="queue-list">
            {queue.map((q) => (
              <div key={q.docId} className="module-list-row" data-testid="queue-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{q.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{q.data.why}</div>
                </div>
                <Tag>{q.data.topic}</Tag>
                <IconButton label="Remove" onClick={() => removeQueued(q.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportQueue}>
          Export Queue as Markdown
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Listening Log">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={logList.length} label="Shows logged" />
          <StatDisplay value={<span data-testid="loved-count">{lovedCount}</span>} label="Loved" />
          <StatDisplay value={queue.length} label="In the queue" />
        </div>

        {logList.length === 0 ? (
          <EmptyState icon="📻">Nothing logged — the curator learns from this.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="log-list">
            {logList.map((l) => (
              <div key={l.docId} className="module-list-row" data-testid="log-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{l.data.show}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{l.data.topic}</span>
                </div>
                <Tag active={l.data.verdict === 'loved'}>{VERDICT_META[l.data.verdict]}</Tag>
                <IconButton label="Remove" onClick={() => removeLog(l.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Show</Label>
            <Input value={show} onChange={(e) => setShow(e.target.value)} placeholder="e.g. Radiolab" data-testid="show-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Topic</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Science" data-testid="topic-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Verdict</Label>
            <Select value={verdict} onChange={(e) => setVerdict(e.target.value as LogEntry['verdict'])} data-testid="verdict-select" style={{ width: '100%' }}>
              <option value="loved">Loved</option>
              <option value="fine">Fine</option>
              <option value="dropped">Dropped</option>
            </Select>
          </div>
          <Button variant="primary" onClick={addLog} data-testid="add-log-button">
            + Log Show
          </Button>
        </div>
      </Section>
    </div>
  );
}
