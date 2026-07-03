import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Meeting Follow-Up Automator — paste raw meeting notes, the AI proxy
// extracts action items in a strict OWNER | TASK | DUE line format the
// module parses into a working checklist (assignable, checkable,
// exportable). Prompting for a machine-parseable format instead of prose
// is the trick — no JSON-repair gymnastics, one line per action.
// CONTRACT.md #11: proxy only, all three failure states rendered.

type Action = { meeting: string; owner: string; task: string; due: string; done: boolean };

const SYSTEM_PROMPT = [
  'You extract action items from meeting notes.',
  'Output ONLY action lines, one per line, in exactly this format:',
  'OWNER | TASK | DUE',
  "OWNER is a name from the notes (or 'Unassigned'). TASK is a single imperative sentence. DUE is the deadline mentioned (or 'no date').",
  'No headers, no numbering, no commentary. If there are no action items, output exactly: NONE',
].join(' ');

function parseActions(text: string, meeting: string): Action[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'NONE' && l.includes('|'))
    .map((line) => {
      const [owner = 'Unassigned', task = '', due = 'no date'] = line.split('|').map((p) => p.trim());
      return { meeting, owner, task, due, done: false };
    })
    .filter((a) => a.task.length > 0);
}

export function MeetingFollowUpAutomator({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [actions, setActions] = useState<StoreDoc<Action>[] | null>(null);
  const [meetingName, setMeetingName] = useState('');
  const [notes, setNotes] = useState('');
  const [working, setWorking] = useState(false);
  const [extracted, setExtracted] = useState<Action[] | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Action>('actions').then(setActions);
  }, [store]);

  const list = actions ?? [];
  const openCount = list.filter((a) => !a.data.done).length;

  async function extract() {
    if (!ai || working || notes.trim().length < 30) return;
    setWorking(true);
    setFailure(null);
    setExtracted(null);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: notes.trim().slice(0, 12_000) });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setExtracted(parseActions(res.text, meetingName.trim() || `Meeting — ${new Date().toISOString().slice(0, 10)}`));
  }

  async function keepExtracted() {
    if (!extracted) return;
    const created: StoreDoc<Action>[] = [];
    for (const a of extracted) created.push(await store.create('actions', a));
    setActions((prev) => [...created, ...(prev ?? [])]);
    setExtracted(null);
    setNotes('');
    setMeetingName('');
  }

  async function toggleDone(doc: StoreDoc<Action>) {
    const updated = await store.update('actions', doc.docId, { ...doc.data, done: !doc.data.done });
    setActions((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
  }

  async function remove(docId: string) {
    await store.remove('actions', docId);
    setActions((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  function exportFollowUp() {
    const byMeeting = new Map<string, StoreDoc<Action>[]>();
    for (const a of list) byMeeting.set(a.data.meeting, [...(byMeeting.get(a.data.meeting) ?? []), a]);
    const lines = Array.from(byMeeting.entries()).map(
      ([meeting, items]) => `## ${meeting}\n\n${items.map((a) => `- [${a.data.done ? 'x' : ' '}] **${a.data.owner}** — ${a.data.task} _(${a.data.due})_`).join('\n')}`,
    );
    const md = ['# Follow-Ups', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'follow-ups.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (actions === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="meeting-follow-up-automator-root">
      <Section title="Extract Action Items">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Label>Meeting</Label>
              <Input value={meetingName} onChange={(e) => setMeetingName(e.target.value)} placeholder="e.g. Weekly sync — July 3" data-testid="meeting-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={extract} data-testid="extract-button" disabled={working || notes.trim().length < 30}>
              {working ? '🗣️ Extracting…' : '🗣️ Extract Follow-Ups'}
            </Button>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste the raw meeting notes or transcript here…" data-testid="notes-input" rows={6} style={{ width: '100%' }} />

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited use.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 AI needs an account, even to try it — sign in and you'll get a few free extractions.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free AI calls are used up — unlock the app to keep extracting.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 AI is offline right now — your notes are untouched, try again in a bit.
            </div>
          )}

          {extracted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="extracted-panel">
              {extracted.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)', margin: 0 }}>No action items found in those notes.</p>
              ) : (
                <>
                  {extracted.map((a, i) => (
                    <div key={i} className="module-list-row" data-testid="extracted-item" style={{ alignItems: 'center' }}>
                      <Tag active>{a.owner}</Tag>
                      <div className="module-list-row-content" style={{ flex: 1, fontSize: 13 }}>
                        {a.task}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>{a.due}</span>
                    </div>
                  ))}
                  <Button variant="secondary" onClick={keepExtracted} data-testid="keep-button" style={{ alignSelf: 'flex-start' }}>
                    💾 Add {extracted.length} to the Board
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Follow-Up Board">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="open-count">{openCount}</span>} label="Open action items" />
          <StatDisplay value={list.length - openCount} label="Completed" />
        </div>

        {list.length === 0 ? (
          <EmptyState icon="🗣️">Nothing on the board — extract follow-ups from your last meeting.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="actions-list">
            {list.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="action-item" style={{ alignItems: 'center', opacity: a.data.done ? 0.6 : 1 }}>
                <Tag active={a.data.done} onClick={() => toggleDone(a)}>
                  {a.data.done ? '✓' : '○'}
                </Tag>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600, textDecoration: a.data.done ? 'line-through' : 'none' }}>{a.data.task}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {a.data.owner} · due {a.data.due} · {a.data.meeting}
                  </div>
                </div>
                <IconButton label="Remove" onClick={() => remove(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportFollowUp}>
          ⬇️ Export Follow-Ups as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
