import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, SegmentedControl, EmptyState, LoadingState } from '@vault/module-ui';

// Smart Content Generator & Summarizer — the Phase 7 flagship AI module:
// summarize pasted text (three lengths) or outline new content (four
// formats), all through the platform AI proxy via the `ai` prop
// (CONTRACT.md #11 — no provider SDK, no key, no canned answers). All
// three proxy failure states render as real UI, and the preview
// free-call countdown is shown when the server sends it. Outputs you
// keep are saved to the store.

type Saved = { kind: 'summary' | 'outline'; title: string; output: string };

const SUMMARY_STYLES: Record<string, string> = {
  'One-Liner': 'Summarize in exactly one sentence.',
  'Short Paragraph': 'Summarize in one tight paragraph, 3-4 sentences.',
  'Bullet Points': 'Summarize as 4-6 concise bullet points, each starting with "• ".',
};

const OUTLINE_FORMATS: Record<string, string> = {
  'Blog Post': 'a blog post outline with a hook, 3-5 sections, and a closing CTA',
  'Email': 'a persuasive email outline: subject line, opening, 2-3 body beats, sign-off',
  'Video Script': 'a short-video script outline: cold open, 3 segments with timestamps, outro',
  'Presentation': 'a slide-deck outline: title slide, 5-7 slides with one takeaway each',
};

export function SmartContentGeneratorSummarizer({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [saved, setSaved] = useState<StoreDoc<Saved>[] | null>(null);
  const [tool, setTool] = useState('Summarize');
  const [sourceText, setSourceText] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('Bullet Points');
  const [topic, setTopic] = useState('');
  const [outlineFormat, setOutlineFormat] = useState('Blog Post');
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<{ title: string; kind: Saved['kind']; text: string } | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Saved>('saved').then(setSaved);
  }, [store]);

  async function run() {
    if (!ai || working) return;
    const isSummary = tool === 'Summarize';
    if (isSummary && sourceText.trim().length < 40) return;
    if (!isSummary && !topic.trim()) return;

    setWorking(true);
    setFailure(null);
    setResult(null);

    const res = await ai.complete(
      isSummary
        ? {
            system: `You are a precise summarizer. ${SUMMARY_STYLES[summaryStyle]} No preamble, no commentary — output only the summary.`,
            prompt: sourceText.trim().slice(0, 12_000),
          }
        : {
            system: `You are a sharp content strategist. Produce ${OUTLINE_FORMATS[outlineFormat]}. Numbered points, no preamble, no filler.`,
            prompt: `Topic: ${topic.trim()}`,
          },
    );

    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    setResult({
      kind: isSummary ? 'summary' : 'outline',
      title: isSummary ? `Summary (${summaryStyle.toLowerCase()})` : `${outlineFormat}: ${topic.trim().slice(0, 60)}`,
      text: res.text,
    });
  }

  async function keepResult() {
    if (!result) return;
    const doc = await store.create('saved', { kind: result.kind, title: result.title, output: result.text });
    setSaved((prev) => [doc, ...(prev ?? [])]);
    setResult(null);
  }

  async function removeSaved(docId: string) {
    await store.remove('saved', docId);
    setSaved((prev) => (prev ?? []).filter((s) => s.docId !== docId));
  }

  function exportSaved() {
    const lines = (saved ?? []).map((s) => `## ${s.data.title}\n\n${s.data.output}`);
    const md = ['# Generated Content', '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-content.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (saved === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="smart-content-generator-root">
      <Section title="Generate">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SegmentedControl options={['Summarize', 'Outline'].map((v) => ({ value: v, label: v }))} value={tool} onChange={setTool} data-testid="tool-control" />

          {tool === 'Summarize' ? (
            <>
              <div>
                <Label>Text to Summarize</Label>
                <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Paste the article, memo, or transcript here (40+ characters)…" data-testid="source-input" rows={5} style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ width: 180 }}>
                  <Label>Length</Label>
                  <Select value={summaryStyle} onChange={(e) => setSummaryStyle(e.target.value)} data-testid="style-select" style={{ width: '100%' }}>
                    {Object.keys(SUMMARY_STYLES).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="primary" onClick={run} data-testid="run-button" disabled={working || sourceText.trim().length < 40}>
                  {working ? '🤖 Summarizing…' : '🤖 Summarize'}
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Label>Topic</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Onboarding emails that don't get ignored" data-testid="topic-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 160 }}>
                <Label>Format</Label>
                <Select value={outlineFormat} onChange={(e) => setOutlineFormat(e.target.value)} data-testid="format-select" style={{ width: '100%' }}>
                  {Object.keys(OUTLINE_FORMATS).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <Button variant="primary" onClick={run} data-testid="run-button" disabled={working || !topic.trim()}>
                {working ? '🤖 Outlining…' : '🤖 Generate Outline'}
              </Button>
            </div>
          )}

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for unlimited use.
            </p>
          )}

          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 AI needs an account, even to try it — sign in and you'll get a few free generations.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free AI calls are used up — unlock the app to keep generating.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 AI is offline right now — your text is untouched, try again in a bit.
            </div>
          )}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="result-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)', whiteSpace: 'pre-wrap' }} data-testid="result-text">
                {result.text}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" onClick={keepResult} data-testid="keep-button">
                  💾 Keep It
                </Button>
                <Button variant="ghost" onClick={run} data-testid="retry-button" disabled={working}>
                  🔁 Regenerate
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Saved Outputs">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="saved-count">{saved.length}</span>} label="Outputs kept" />
          <StatDisplay value={saved.filter((s) => s.data.kind === 'summary').length} label="Summaries" />
          <StatDisplay value={saved.filter((s) => s.data.kind === 'outline').length} label="Outlines" />
        </div>

        {saved.length === 0 ? (
          <EmptyState icon="🤖">Nothing saved yet — generate something and keep it.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="saved-list">
            {saved.map((s) => (
              <div key={s.docId} className="module-list-row" data-testid="saved-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag>{s.data.kind === 'summary' ? '📝 Summary' : '🧭 Outline'}</Tag>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{s.data.title}</span>
                  </div>
                  <IconButton label="Remove" onClick={() => removeSaved(s.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-dim)', whiteSpace: 'pre-wrap', marginLeft: 4 }}>{s.data.output}</div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSaved}>
          ⬇️ Export Saved Outputs as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
