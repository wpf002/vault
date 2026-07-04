import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Language Learning Game — multiple-choice translation rounds over a
// Spanish phrase deck where every card carries a cultural note that's
// revealed on a correct answer (the "cultural context" is the reward,
// not a footnote). 3 hearts per round, +20 XP per correct answer, streak
// tracking persists. The deck is editable — add the phrases you're
// actually collecting.

type Card = { word: string; translation: string; note: string };
type Progress = { xp: number; bestStreak: number };

type Round = { cardIndex: number; options: string[]; answered: 'correct' | 'wrong' | null };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function LanguageLearningGame({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [cards, setCards] = useState<StoreDoc<Card>[] | null>(null);
  const [progress, setProgress] = useState<StoreDoc<Progress> | null | undefined>(undefined);
  const [round, setRound] = useState<Round | null>(null);
  const [hearts, setHearts] = useState(3);
  const [streak, setStreak] = useState(0);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    store.list<Card>('cards').then(setCards);
    store.list<Progress>('progress').then((docs) => setProgress(docs[0] ?? null));
  }, [store]);

  const deck = cards ?? [];
  const xp = progress?.data.xp ?? 0;
  const bestStreak = progress?.data.bestStreak ?? 0;

  async function saveProgress(next: Progress) {
    if (progress) {
      const updated = await store.update('progress', progress.docId, next);
      setProgress(updated);
    } else {
      const doc = await store.create('progress', next);
      setProgress(doc);
    }
  }

  function nextRound() {
    if (deck.length < 3) return;
    const cardIndex = Math.floor(Math.random() * deck.length);
    const wrong = shuffle(deck.filter((_, i) => i !== cardIndex)).slice(0, 2).map((c) => c.data.translation);
    setRound({ cardIndex, options: shuffle([deck[cardIndex]!.data.translation, ...wrong]), answered: null });
  }

  async function answer(option: string) {
    if (!round || round.answered === 'correct') return;
    const card = deck[round.cardIndex]!.data;
    if (option === card.translation) {
      setRound({ ...round, answered: 'correct' });
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      await saveProgress({ xp: xp + 20, bestStreak: Math.max(bestStreak, nextStreak) });
    } else {
      setRound({ ...round, answered: 'wrong' });
      setStreak(0);
      setHearts((h) => {
        const next = h - 1;
        if (next <= 0) setRound(null); // round over — hearts reset on next start
        return next;
      });
    }
  }

  function startRun() {
    setHearts(3);
    setStreak(0);
    nextRound();
  }

  async function addCard() {
    if (!word.trim() || !translation.trim()) return;
    const doc = await store.create('cards', { word: word.trim(), translation: translation.trim(), note: note.trim() || 'Add a cultural note — that context is what makes it stick.' });
    setCards((prev) => [...(prev ?? []), doc]);
    setWord('');
    setTranslation('');
    setNote('');
  }

  async function removeCard(docId: string) {
    await store.remove('cards', docId);
    setCards((prev) => (prev ?? []).filter((c) => c.docId !== docId));
    setRound(null);
  }

  function exportDeck() {
    const rows = deck.map((c) => `"${c.data.word}","${c.data.translation}","${c.data.note.replace(/"/g, '""')}"`);
    const csv = ['phrase,translation,cultural note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'phrase-deck.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (cards === null || progress === undefined) return <LoadingState />;

  const currentCard = round ? deck[round.cardIndex] : null;

  return (
    <div className="module-card" data-testid="language-learning-game-root">
      <Section title="Your Stats">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="xp-value">{xp} XP</span>} label="Experience earned" />
          <StatDisplay value={<span data-testid="streak-value">{streak}</span>} label={`Current streak · best ${bestStreak}`} />
          <StatDisplay value={deck.length} label="Phrases in your deck" />
        </div>
      </Section>

      <Divider />

      <Section title="Play">
        {deck.length < 3 ? (
          <EmptyState icon="🕹️">The game needs at least 3 phrases — add more below.</EmptyState>
        ) : !round || !currentCard ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={startRun} data-testid="start-button">
              Start a Round
            </Button>
            {hearts <= 0 && <span style={{ fontSize: 12, color: '#ff6b5e' }}>Out of hearts — start fresh.</span>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="game-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span data-testid="hearts">{'❤️'.repeat(hearts)}{'🖤'.repeat(3 - hearts)}</span>
              <Tag active={streak > 0}>🔥 Streak {streak}</Tag>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', margin: 0 }} data-testid="prompt-word">
              {currentCard.data.word}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {round.options.map((o) => (
                <Button
                  key={o}
                  variant="secondary"
                  onClick={() => answer(o)}
                  data-testid={`option-${round.options.indexOf(o)}`}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                  disabled={round.answered === 'correct'}
                >
                  {o}
                </Button>
              ))}
            </div>
            {round.answered === 'wrong' && (
              <span style={{ fontSize: 12, color: '#ff6b5e' }} data-testid="wrong-message">
                ⛔ Not that one — you lost a heart. Try again.
              </span>
            )}
            {round.answered === 'correct' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="correct-panel">
                <span style={{ fontSize: 12, color: '#39d98a' }}>✅ +20 XP</span>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface-2, rgba(255,255,255,0.06))', fontSize: 13, lineHeight: 1.5 }} data-testid="cultural-note">
                  🌍 {currentCard.data.note}
                </div>
                <Button variant="primary" onClick={nextRound} data-testid="next-button" style={{ alignSelf: 'flex-start' }}>
                  Next Phrase →
                </Button>
              </div>
            )}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Phrase Deck">
        {deck.length === 0 ? (
          <EmptyState icon="🃏">No phrases yet.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="deck-list">
            {deck.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="card-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.data.word}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{c.data.translation}</span>
                </div>
                <IconButton label="Remove" onClick={() => removeCard(c.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>Phrase</Label>
            <Input value={word} onChange={(e) => setWord(e.target.value)} placeholder="e.g. la sombremesa" data-testid="word-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Translation</Label>
            <Input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="what it means" data-testid="translation-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Cultural Note</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="when/why locals say it" data-testid="note-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addCard} data-testid="add-card-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDeck}>
          Export Deck as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
