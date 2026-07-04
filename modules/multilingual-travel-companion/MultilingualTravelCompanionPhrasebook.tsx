import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Multilingual Travel Companion & Phrasebook — type what you want to
// say, get TRANSLATION | PRONUNCIATION | ETIQUETTE back through the
// proxy: not just the words but how to say them and the cultural
// context a phrasebook app never gives you. Keepers build a per-language
// phrasebook. Scope note: mic-based "real-time" voice is device audio
// infra — typed phrases are the substance. CONTRACT.md #11 rendered.

type Phrase = { original: string; language: string; translation: string; pronunciation: string; etiquette: string };

const LANGUAGES = ['Japanese', 'Spanish', 'French', 'Italian', 'German', 'Portuguese', 'Thai', 'Turkish', 'Greek', 'Korean'];

const SYSTEM_PROMPT = [
  'You are a travel interpreter and cultural guide. Given a phrase and target language, output EXACTLY one line:',
  'TRANSLATION (native script plus romanization in parentheses if non-Latin) | PRONUNCIATION (simple phonetic syllables with caps for stress) | ETIQUETTE (one practical cultural tip about using this phrase in that country)',
  'No headers, no commentary — just that one line.',
].join(' ');

function parsePhrase(text: string): { translation: string; pronunciation: string; etiquette: string } | null {
  const line = text.split('\n').find((l) => l.includes('|'));
  if (!line) return null;
  const [translation = '', pronunciation = '', ...rest] = line.split('|').map((p) => p.trim());
  if (!translation) return null;
  return { translation, pronunciation, etiquette: rest.join(' | ') || '—' };
}

export function MultilingualTravelCompanionPhrasebook({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [phrasebook, setPhrasebook] = useState<StoreDoc<Phrase>[] | null>(null);
  const [original, setOriginal] = useState('');
  const [language, setLanguage] = useState('Japanese');
  const [working, setWorking] = useState(false);
  const [current, setCurrent] = useState<Phrase | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    store.list<Phrase>('phrasebook').then(setPhrasebook);
  }, [store]);

  const book = phrasebook ?? [];
  const languages = Array.from(new Set(book.map((p) => p.data.language)));
  const shown = filter ? book.filter((p) => p.data.language === filter) : book;

  async function translate() {
    if (!ai || working || !original.trim()) return;
    setWorking(true);
    setFailure(null);
    setCurrent(null);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Phrase: "${original.trim()}" → ${language}`, maxTokens: 250 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const parsed = parsePhrase(res.text);
    if (parsed) setCurrent({ original: original.trim(), language, ...parsed });
  }

  async function keepPhrase() {
    if (!current) return;
    const doc = await store.create('phrasebook', current);
    setPhrasebook((prev) => [doc, ...(prev ?? [])]);
    setCurrent(null);
    setOriginal('');
  }

  async function removePhrase(docId: string) {
    await store.remove('phrasebook', docId);
    setPhrasebook((prev) => (prev ?? []).filter((p) => p.docId !== docId));
  }

  function exportPhrasebook() {
    const byLang = new Map<string, StoreDoc<Phrase>[]>();
    for (const p of book) byLang.set(p.data.language, [...(byLang.get(p.data.language) ?? []), p]);
    const sections = Array.from(byLang.entries()).map(
      ([lang, phrases]) => `## ${lang}\n\n${phrases.map((p) => `- **${p.data.original}** → ${p.data.translation}\n  - Say it: ${p.data.pronunciation}\n  - 💡 ${p.data.etiquette}`).join('\n')}`,
    );
    const md = ['# My Phrasebook', '', ...sections].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'phrasebook.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (phrasebook === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="multilingual-travel-companion-root">
      <Section title="Say It Like a Local">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Label>What Do You Want to Say?</Label>
              <Input
                value={original}
                onChange={(e) => setOriginal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && translate()}
                placeholder="e.g. Is this dish very spicy?"
                data-testid="phrase-input"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ width: 150 }}>
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)} data-testid="language-select" style={{ width: '100%' }}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="primary" onClick={translate} data-testid="translate-button" disabled={working || !original.trim()}>
              {working ? 'Translating…' : 'Translate'}
            </Button>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'translation' : 'translations'} left in preview — unlock the app for the full companion.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Translation needs an account, even to try it — sign in for a few free phrases.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free translations are used up — unlock the app before the trip.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The companion is offline right now — your phrasebook still works, try again in a bit.
            </div>
          )}

          {current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="result-panel">
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }} data-testid="translation-text">
                  {current.translation}
                </div>
                <div style={{ fontSize: 13, color: 'var(--module-accent)' }}>🗣️ {current.pronunciation}</div>
                <div style={{ fontSize: 13, color: 'var(--color-text-dim)', lineHeight: 1.6 }}>💡 {current.etiquette}</div>
              </div>
              <Button variant="secondary" onClick={keepPhrase} data-testid="keep-button" style={{ alignSelf: 'flex-start' }}>
                Add to Phrasebook
              </Button>
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Your Phrasebook">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="phrase-count">{book.length}</span>} label="Phrases saved" />
          <StatDisplay value={languages.length} label="Languages" />
        </div>

        {languages.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <Tag active={filter === null} onClick={() => setFilter(null)}>
              All
            </Tag>
            {languages.map((l) => (
              <Tag key={l} active={filter === l} onClick={() => setFilter(filter === l ? null : l)}>
                {l}
              </Tag>
            ))}
          </div>
        )}

        {shown.length === 0 ? (
          <EmptyState icon="📖">Nothing saved{filter ? ` in ${filter}` : ''} — translate something worth keeping.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="phrasebook-list">
            {shown.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="phrase-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.original}</span>
                  </div>
                  <Tag>{p.data.language}</Tag>
                  <IconButton label="Remove" onClick={() => removePhrase(p.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 14, color: 'var(--module-accent)', marginLeft: 4 }}>{p.data.translation}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginLeft: 4 }}>
                  🗣️ {p.data.pronunciation} · 💡 {p.data.etiquette}
                </div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportPhrasebook}>
          Export Phrasebook as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
