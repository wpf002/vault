import { useEffect, useRef, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiMessage, AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Chatbot for HRMS — load your company's actual policies, then chat:
// every answer is grounded in those documents (the system prompt forbids
// answering beyond them and requires a source citation), so the bot
// automates the "what's the PTO policy?" tier of HR questions without
// inventing benefits you don't offer. Multi-turn context goes through
// the proxy as real message history. CONTRACT.md #11 states rendered.

type Policy = { title: string; body: string };
type ChatMsg = { role: 'user' | 'assistant'; text: string };

function buildSystem(policies: Policy[]): string {
  const docs = policies.map((p) => `### ${p.title}\n${p.body}`).join('\n\n');
  return [
    'You are an HR assistant. Answer ONLY from the policy documents below.',
    'Cite the policy title in parentheses at the end, like (Source: PTO Policy).',
    'If the documents do not cover the question, say exactly that and suggest asking HR directly — never invent policy.',
    'Keep answers to 1-3 sentences.',
    '\n\nPOLICY DOCUMENTS:\n' + docs,
  ].join(' ');
}

export function AIChatbotForHRMS({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [policies, setPolicies] = useState<StoreDoc<Policy>[] | null>(null);
  const [chat, setChat] = useState<StoreDoc<ChatMsg>[] | null>(null);
  const [question, setQuestion] = useState('');
  const [pTitle, setPTitle] = useState('');
  const [pBody, setPBody] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    store.list<Policy>('policies').then(setPolicies);
    store.list<ChatMsg>('chat').then(setChat);
  }, [store]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, working]);

  const policyList = policies ?? [];
  const chatList = chat ?? [];

  async function ask() {
    if (!ai || working || !question.trim() || policyList.length === 0) return;
    const q = question.trim();
    setQuestion('');
    setWorking(true);
    setFailure(null);
    const userDoc = await store.create('chat', { role: 'user', text: q } as ChatMsg);
    setChat((prev) => [...(prev ?? []), userDoc]);
    // real multi-turn: recent history + the new question as messages
    const history: AiMessage[] = [...chatList.slice(-8), userDoc].map((m) => ({ role: m.data.role, content: m.data.text }));
    const res = await ai.complete({ system: buildSystem(policyList.map((p) => p.data)), messages: history, maxTokens: 300 });
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

  async function addPolicy() {
    if (!pTitle.trim() || !pBody.trim()) return;
    const doc = await store.create('policies', { title: pTitle.trim(), body: pBody.trim() });
    setPolicies((prev) => [...(prev ?? []), doc]);
    setPTitle('');
    setPBody('');
  }

  async function removePolicy(docId: string) {
    await store.remove('policies', docId);
    setPolicies((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportTranscript() {
    const lines = chatList.map((m) => `**${m.data.role === 'user' ? 'Employee' : 'HR Bot'}:** ${m.data.text}`);
    const md = ['# HR Chat Transcript', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hr-chat-transcript.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (policies === null || chat === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="hrms-chatbot-root">
      <Section title="Ask HR">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 2px' }} data-testid="chat-window">
            {chatList.length === 0 ? (
              <EmptyState icon="🗂️">Ask anything your policies cover — PTO, expenses, remote work…</EmptyState>
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
                🗂️ Checking the policies…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder={policyList.length === 0 ? 'Load a policy first…' : 'e.g. Can I work from Portugal for a month?'}
              data-testid="question-input"
              style={{ flex: 1 }}
              disabled={policyList.length === 0}
            />
            <Button variant="primary" onClick={ask} data-testid="ask-button" disabled={working || !question.trim() || policyList.length === 0}>
              Send
            </Button>
            {chatList.length > 0 && (
              <Button variant="ghost" onClick={clearChat} data-testid="clear-chat-button">
                Clear
              </Button>
            )}
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'question' : 'questions'} left in preview — unlock the app for unlimited HR answers.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The bot needs an account, even to try it — sign in for a few free questions.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free questions are used up — unlock the app to keep the bot on call.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The bot is offline right now — your chat history is intact, try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Policy Library">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="policy-count">{policyList.length}</span>} label="Policies loaded" />
          <StatDisplay value={chatList.filter((m) => m.data.role === 'assistant').length} label="Questions answered" />
        </div>

        {policyList.length === 0 ? (
          <EmptyState icon="📋">No policies loaded — the bot only answers from these.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="policies-list">
            {policyList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="policy-item" style={{ alignItems: 'center' }}>
                <Tag>📄</Tag>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{p.data.body.slice(0, 90)}…</div>
                </div>
                <IconButton label="Remove" onClick={() => removePolicy(p.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>Policy Title</Label>
              <Input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="e.g. Parental Leave" data-testid="policy-title-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addPolicy} data-testid="add-policy-button">
              + Load Policy
            </Button>
          </div>
          <Textarea value={pBody} onChange={(e) => setPBody(e.target.value)} placeholder="Paste the policy text…" data-testid="policy-body-input" rows={3} style={{ width: '100%' }} />
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportTranscript}>
          ⬇️ Export Chat Transcript as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
