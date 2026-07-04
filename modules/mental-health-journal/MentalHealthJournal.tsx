import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Mental Health Journal — mood-tagged journaling where the AI writes a
// short, warm reflection on each entry (a mirror, never a diagnosis).
// SAFETY POSTURE, deliberately conservative: a persistent not-therapy
// disclaimer with crisis resources is always on screen; the system
// prompt forbids diagnosis, treatment advice, and clinical language;
// and both the model AND a local keyword check surface crisis resources
// immediately when an entry suggests acute distress. Built after the
// operator explicitly requested all 120 apps ship.

type Mood = 'good' | 'okay' | 'low';
type Entry = { date: string; mood: Mood; text: string; reflection: string };

const MOOD_META: Record<Mood, { label: string; color: string }> = {
  good: { label: 'Good', color: '#39d98a' },
  okay: { label: 'Okay', color: '#f5c451' },
  low: { label: 'Low', color: '#93c5fd' },
};

const CRISIS_LINE = 'If you are in crisis or thinking about harming yourself, call or text 988 (US) or your local emergency number — right now, not later. You deserve immediate, human support.';

const SYSTEM_PROMPT = [
  'You write short reflections on personal journal entries. You are a warm, careful companion — you are NOT a therapist, and you never pretend to be.',
  'Rules, absolute: never diagnose, never name disorders, never suggest medication or treatment, never use clinical language.',
  'Reflect back what the writer noticed, name one pattern or strength gently, and optionally end with one open question. 2-4 sentences, plain text.',
  `If the entry suggests self-harm, suicide, abuse, or acute crisis, your ENTIRE response must be exactly: "${CRISIS_LINE}"`,
  'If the entry mentions sustained low mood, gently note that talking to a professional is a strong move, in one clause, without pressure.',
].join(' ');

// Local safety net — never rely on the model alone for this.
const CRISIS_PATTERNS = /suicid|kill myself|end my life|self.?harm|hurt myself|don'?t want to (live|be here)|no reason to live/i;

const PROMPTS = [
  'What took the most energy today, and what gave any back?',
  'What is one thing you handled better than you would have a year ago?',
  'What are you carrying right now that isn\'t yours to carry?',
  'Describe today to a friend who only wants you to be okay.',
  'What would "10% easier" look like tomorrow?',
];

export function MentalHealthJournal({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [entries, setEntries] = useState<StoreDoc<Entry>[] | null>(null);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Mood>('okay');
  const [promptIdx, setPromptIdx] = useState(0);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Entry>('entries').then(setEntries);
  }, [store]);

  const list = entries ?? [];
  const moodCounts = useMemo(() => {
    const c: Record<Mood, number> = { good: 0, okay: 0, low: 0 };
    for (const e of list.slice(0, 14)) c[e.data.mood]++;
    return c;
  }, [list]);

  async function saveEntry() {
    if (working || text.trim().length < 10) return;
    setWorking(true);
    setFailure(null);

    // Local crisis check runs BEFORE anything else — the resources render
    // even if the AI is unavailable.
    const crisisDetected = CRISIS_PATTERNS.test(text);

    let reflection = '';
    if (crisisDetected) {
      reflection = CRISIS_LINE;
    } else if (ai) {
      const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Journal entry (mood: ${mood}): ${text.trim().slice(0, 4000)}`, maxTokens: 250 });
      if (res.ok) {
        reflection = res.text.trim();
        setRemaining(res.remainingPreviewCalls ?? null);
      } else if (res.reason === 'sign_in_required' || res.reason === 'preview_exhausted') {
        setFailure(res.reason);
        setWorking(false);
        return; // don't save a half-entry when the block is actionable
      } else {
        reflection = ''; // AI offline — the entry still saves, reflection just stays empty
      }
    }

    const entry: Entry = { date: new Date().toISOString().slice(0, 10), mood, text: text.trim(), reflection };
    const doc = await store.create('entries', entry);
    setEntries((prev) => [doc, ...(prev ?? [])]);
    setText('');
    setWorking(false);
  }

  async function removeEntry(docId: string) {
    await store.remove('entries', docId);
    setEntries((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportJournal() {
    const lines = [...list].reverse().map((e) => `## ${e.data.date} — ${MOOD_META[e.data.mood].label}\n\n${e.data.text}${e.data.reflection ? `\n\n> ${e.data.reflection}` : ''}`);
    const md = ['# Journal', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'journal.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (entries === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="mental-health-journal-root">
      <div
        data-testid="safety-banner"
        style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', marginBottom: 14 }}
      >
        This is a journal, not therapy or medical care. If you're struggling, a professional is the right next step —
        and if you're in crisis, call or text <strong style={{ color: 'var(--color-text)' }}>988</strong> (US) or your
        local emergency number.
      </div>

      <Section title="Today's Entry">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Mood:</span>
            {(Object.keys(MOOD_META) as Mood[]).map((m) => (
              <Tag key={m} active={mood === m} onClick={() => setMood(m)}>
                {MOOD_META[m].label}
              </Tag>
            ))}
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={() => setPromptIdx((i) => (i + 1) % PROMPTS.length)} data-testid="prompt-button" style={{ padding: '4px 10px', fontSize: 12 }}>
              New Prompt
            </Button>
          </div>
          <p style={{ fontSize: 13, color: 'var(--module-accent)', margin: 0, fontStyle: 'italic' }} data-testid="writing-prompt">
            {PROMPTS[promptIdx]}
          </p>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write freely — this is yours." data-testid="entry-input" rows={5} style={{ width: '100%' }} />
          <Button variant="primary" onClick={saveEntry} data-testid="save-button" disabled={working || text.trim().length < 10} style={{ alignSelf: 'flex-start' }}>
            {working ? 'Saving…' : 'Save Entry'}
          </Button>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              {remaining} free AI {remaining === 1 ? 'reflection' : 'reflections'} left in the demo.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              Reflections need an account — sign in and your journal stays private to you.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>Your free demo reflections are used up.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Mood, Last 14 Entries">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 4 }}>
          {(Object.keys(MOOD_META) as Mood[]).map((m) => (
            <StatDisplay key={m} value={<span style={{ color: MOOD_META[m].color }} data-testid={`mood-${m}`}>{moodCounts[m]}</span>} label={MOOD_META[m].label} />
          ))}
        </div>
      </Section>

      <Divider />

      <Section title="Past Entries">
        {list.length === 0 ? (
          <EmptyState icon="📔">No entries yet — the first one is the hardest and the most worth it.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }} data-testid="entries-list">
            {list.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="entry-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MOOD_META[e.data.mood].color }}>{MOOD_META[e.data.mood].label}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', flex: 1 }}>{e.data.date}</span>
                  <IconButton label="Remove" onClick={() => removeEntry(e.docId)}>
                    ✕
                  </IconButton>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text)', margin: 0, whiteSpace: 'pre-wrap' }}>{e.data.text}</p>
                {e.data.reflection && (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-dim)', fontStyle: 'italic' }} data-testid="reflection">
                    {e.data.reflection}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportJournal}>
          Export Journal as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
