import { useEffect, useRef, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiMessage, AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, IconButton, Input, Section, Divider, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Mental Health Companion — a supportive-listening chat plus a set of
// fully deterministic guided exercises (breathing, grounding — no AI in
// the exercises at all). SAFETY POSTURE, the strictest in the catalog:
// crisis resources are permanently on screen; a local keyword check
// intercepts crisis language BEFORE any model call and answers with
// resources directly; the system prompt is hard-bounded to supportive
// listening (no diagnosis, no treatment, no clinical claims) and must
// itself surface crisis resources on any doubt. Every few exchanges the
// companion is required to normalize seeking professional help. Built
// after the operator explicitly requested all 120 apps ship.

type ChatMsg = { role: 'user' | 'assistant'; text: string };

const CRISIS_LINE =
  "It sounds like you're carrying something really heavy right now, and this app isn't the right support for that moment — a human is. Please call or text 988 (US) or your local emergency number now. If you can, reach out to someone you trust and tell them how you're feeling. You matter, and immediate help exists.";

const SYSTEM_PROMPT = [
  'You are a supportive listening companion. You are NOT a therapist, doctor, or crisis service, and you say so plainly if the user treats you as one.',
  'Absolute rules: never diagnose, never name disorders, never recommend or discuss medication, never promise outcomes, never use clinical techniques by name.',
  'What you do: listen, validate specifically (not generically), reflect back, ask at most one gentle open question, and keep responses to 3-5 sentences.',
  'Roughly every third response, naturally normalize professional support (a counselor or therapist) as a strong, ordinary choice.',
  `If the user expresses ANY suggestion of self-harm, suicide, harming others, abuse, or acute crisis — even ambiguous — your ENTIRE response must be exactly: "${CRISIS_LINE}"`,
].join(' ');

// Local safety net, checked before the model is ever called.
const CRISIS_PATTERNS = /suicid|kill myself|end my life|self.?harm|hurt (myself|someone)|don'?t want to (live|be here)|no reason to live|better off without me/i;

const EXERCISES: { name: string; steps: string[] }[] = [
  {
    name: 'Box Breathing (1 Minute)',
    steps: [
      'Sit comfortably and exhale fully.',
      'Breathe in through your nose for a slow count of 4.',
      'Hold for 4. Not straining — just pausing.',
      'Breathe out through your mouth for 4.',
      'Hold empty for 4. That is one box — repeat it 4 times.',
    ],
  },
  {
    name: '5-4-3-2-1 Grounding',
    steps: [
      'Name 5 things you can see, slowly.',
      'Name 4 things you can physically feel (feet on floor, chair, fabric).',
      'Name 3 things you can hear right now.',
      'Name 2 things you can smell (or like the smell of).',
      'Name 1 thing you can taste. Notice where your mind is now versus a minute ago.',
    ],
  },
  {
    name: 'Unload the Loop',
    steps: [
      'Set a 3-minute timer.',
      'Write the thought that keeps looping, exactly as it sounds in your head.',
      'Under it, write what you would say to a friend who showed you that sentence.',
      'Read the second thing out loud once.',
    ],
  },
];

export function AIMentalHealthCompanion({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [chat, setChat] = useState<StoreDoc<ChatMsg>[] | null>(null);
  const [message, setMessage] = useState('');
  const [openExercise, setOpenExercise] = useState<number | null>(null);
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    store.list<ChatMsg>('chat').then(setChat);
  }, [store]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, working]);

  const chatList = chat ?? [];

  async function send() {
    if (working || !message.trim()) return;
    const text = message.trim();
    setMessage('');
    setFailure(null);

    const userDoc = await store.create('chat', { role: 'user', text } as ChatMsg);
    setChat((prev) => [...(prev ?? []), userDoc]);

    // Crisis check runs locally FIRST — resources appear even with AI offline,
    // signed out, or out of demo calls. Nothing gates safety information.
    if (CRISIS_PATTERNS.test(text)) {
      const botDoc = await store.create('chat', { role: 'assistant', text: CRISIS_LINE } as ChatMsg);
      setChat((prev) => [...(prev ?? []), botDoc]);
      return;
    }

    if (!ai) return;
    setWorking(true);
    const history: AiMessage[] = [...chatList.slice(-8), userDoc].map((m) => ({ role: m.data.role, content: m.data.text }));
    const res = await ai.complete({ system: SYSTEM_PROMPT, messages: history, maxTokens: 350 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const botDoc = await store.create('chat', { role: 'assistant', text: res.text.trim() } as ChatMsg);
    setChat((prev) => [...(prev ?? []), botDoc]);
  }

  async function clearChat() {
    for (const m of chatList) await store.remove('chat', m.docId);
    setChat([]);
  }

  if (chat === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="ai-mental-health-companion-root">
      <div
        data-testid="safety-banner"
        style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', marginBottom: 14 }}
      >
        A supportive companion — not therapy, not medical care, and not a crisis service. In crisis, call or text{' '}
        <strong style={{ color: 'var(--color-text)' }}>988</strong> (US) or your local emergency number. A counselor or
        therapist is the right place for ongoing support.
      </div>

      <Section title="Talk It Through">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 2px' }} data-testid="chat-window">
            {chatList.length === 0 ? (
              <EmptyState icon="🫂">Whatever is on your mind is a fine place to start.</EmptyState>
            ) : (
              chatList.map((m) => (
                <div
                  key={m.docId}
                  data-testid={`msg-${m.data.role}`}
                  style={{
                    alignSelf: m.data.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    fontSize: 13,
                    lineHeight: 1.6,
                    background: m.data.role === 'user' ? 'var(--module-accent)' : 'var(--color-surface-2, rgba(255,255,255,0.06))',
                    color: m.data.role === 'user' ? '#101010' : 'var(--color-text)',
                  }}
                >
                  {m.data.text}
                </div>
              ))
            )}
            {working && (
              <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, fontSize: 13, background: 'var(--color-surface-2, rgba(255,255,255,0.06))', color: 'var(--color-text-dim)' }} data-testid="typing-indicator">
                Listening…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="What's going on?"
              data-testid="message-input"
              style={{ flex: 1 }}
            />
            <Button variant="primary" onClick={send} data-testid="send-button" disabled={working || !message.trim()}>
              Send
            </Button>
            {chatList.length > 0 && (
              <Button variant="ghost" onClick={clearChat} data-testid="clear-button">
                Clear
              </Button>
            )}
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              {remaining} free demo {remaining === 1 ? 'exchange' : 'exchanges'} left. The guided exercises below are always available.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              The companion needs an account — your conversations stay private to you. The exercises below work without one.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>Demo exchanges are used up — the exercises below are always free.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Continue
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              The companion is offline right now. The exercises below don't need it — and if things are urgent, 988 is
              always there.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Guided Exercises">
        <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '0 0 10px' }}>
          Simple, evidence-informed practices. No AI involved — they work offline, signed out, anytime.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="exercises-list">
          {EXERCISES.map((ex, i) => (
            <div key={ex.name} className="module-list-row" data-testid="exercise-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{ex.name}</span>
                </div>
                <Button variant="secondary" onClick={() => setOpenExercise(openExercise === i ? null : i)} data-testid={`open-exercise-${i}`} style={{ padding: '5px 12px', fontSize: 12 }}>
                  {openExercise === i ? 'Close' : 'Begin'}
                </Button>
              </div>
              {openExercise === i && (
                <ol style={{ margin: '0 0 4px', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }} data-testid={`exercise-steps-${i}`}>
                  {ex.steps.map((s, j) => (
                    <li key={j} style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)' }}>
                      {s}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
