import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, Section, Divider, StatDisplay, Tag, LoadingState } from '@vault/module-ui';

// Educational Mini-Game Arcade — three short built-in games, each a
// 10-round run: Math Sprint (mental arithmetic), Odd One Out (category
// reasoning over a curated word bank), and Estimate It (order-of-
// magnitude number sense). Only high scores persist — the games
// themselves are pure client state, which is the point of an arcade.

type HighScore = { game: string; best: number; plays: number };

type GameId = 'math-sprint' | 'odd-one-out' | 'estimate-it';

const GAMES: { id: GameId; name: string; icon: string; teaches: string }[] = [
  { id: 'math-sprint', name: 'Math Sprint', icon: '➗', teaches: 'Mental arithmetic' },
  { id: 'odd-one-out', name: 'Odd One Out', icon: '🔍', teaches: 'Category reasoning' },
  { id: 'estimate-it', name: 'Estimate It', icon: '📏', teaches: 'Order-of-magnitude sense' },
];

const ROUNDS = 10;

// Odd One Out bank: three fit a category, one doesn't (index stored)
const ODD_BANK: { words: string[]; oddIndex: number; category: string }[] = [
  { words: ['Mercury', 'Venus', 'Titan', 'Mars'], oddIndex: 2, category: 'planets (Titan is a moon)' },
  { words: ['Femur', 'Tibia', 'Bicep', 'Ulna'], oddIndex: 2, category: 'bones (bicep is a muscle)' },
  { words: ['Copper', 'Bronze', 'Iron', 'Gold'], oddIndex: 1, category: 'elements (bronze is an alloy)' },
  { words: ['Nile', 'Amazon', 'Sahara', 'Danube'], oddIndex: 2, category: 'rivers (Sahara is a desert)' },
  { words: ['Sonnet', 'Haiku', 'Fresco', 'Limerick'], oddIndex: 2, category: 'poems (fresco is a painting)' },
  { words: ['Kelvin', 'Watt', 'Celsius', 'Fahrenheit'], oddIndex: 1, category: 'temperature scales (watt is power)' },
  { words: ['Oxygen', 'Hydrogen', 'Water', 'Nitrogen'], oddIndex: 2, category: 'elements (water is a compound)' },
  { words: ['Cello', 'Viola', 'Oboe', 'Violin'], oddIndex: 2, category: 'strings (oboe is a woodwind)' },
  { words: ['Cumulus', 'Stratus', 'Tundra', 'Cirrus'], oddIndex: 2, category: 'clouds (tundra is a biome)' },
  { words: ['Delta', 'Sigma', 'Omega', 'Kappa9'], oddIndex: 3, category: 'Greek letters (Kappa9 is made up)' },
  { words: ['Mitosis', 'Meiosis', 'Osmosis', 'Cytokinesis'], oddIndex: 2, category: 'cell division (osmosis is diffusion)' },
  { words: ['Baroque', 'Cubism', 'Impressionism', 'Photosynthesis'], oddIndex: 3, category: 'art movements' },
];

// Estimate It bank: real quantities, pick the right magnitude
const EST_BANK: { question: string; options: string[]; answerIndex: number }[] = [
  { question: 'Distance from Earth to the Moon', options: ['384 thousand km', '384 million km', '3,840 km'], answerIndex: 0 },
  { question: 'Number of bones in an adult human body', options: ['~50', '~200', '~2,000'], answerIndex: 1 },
  { question: 'Speed of light', options: ['300 km/s', '300,000 km/s', '3,000 km/s'], answerIndex: 1 },
  { question: 'Age of the Earth', options: ['4.5 million years', '4.5 billion years', '450,000 years'], answerIndex: 1 },
  { question: 'Neurons in a human brain', options: ['~86 million', '~86 billion', '~86 trillion'], answerIndex: 1 },
  { question: 'Deepest point in the ocean', options: ['~1 km', '~11 km', '~110 km'], answerIndex: 1 },
  { question: 'Length of the Great Wall of China (all sections)', options: ['~2,100 km', '~21,000 km', '~210,000 km'], answerIndex: 1 },
  { question: 'Water on Earth that is fresh water', options: ['~3%', '~30%', '~0.03%'], answerIndex: 0 },
  { question: 'Time for sunlight to reach Earth', options: ['8 seconds', '8 minutes', '8 hours'], answerIndex: 1 },
  { question: 'Human DNA shared with chimpanzees', options: ['~68%', '~98%', '~78%'], answerIndex: 1 },
];

type MathQ = { prompt: string; options: number[]; answer: number };

function makeMathQ(): MathQ {
  const ops = ['+', '−', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)]!;
  let a = 0, b = 0, answer = 0;
  if (op === '+') { a = 12 + Math.floor(Math.random() * 80); b = 13 + Math.floor(Math.random() * 80); answer = a + b; }
  if (op === '−') { a = 40 + Math.floor(Math.random() * 60); b = Math.floor(Math.random() * 39); answer = a - b; }
  if (op === '×') { a = 3 + Math.floor(Math.random() * 10); b = 4 + Math.floor(Math.random() * 12); answer = a * b; }
  const offsets = [0, 0, 0];
  while (new Set([answer + offsets[1]!, answer + offsets[2]!, answer]).size < 3) {
    offsets[1] = Math.ceil(Math.random() * 9) * (Math.random() < 0.5 ? -1 : 1);
    offsets[2] = Math.ceil(Math.random() * 9) * (Math.random() < 0.5 ? -1 : 1);
  }
  const options = [answer, answer + offsets[1]!, answer + offsets[2]!].sort(() => Math.random() - 0.5);
  return { prompt: `${a} ${op} ${b}`, options, answer };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

type Run = { game: GameId; round: number; score: number; feedback: string | null };

export function EducationalMiniGameArcade({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [scores, setScores] = useState<StoreDoc<HighScore>[] | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [mathQ, setMathQ] = useState<MathQ | null>(null);
  const [oddDeck, setOddDeck] = useState<typeof ODD_BANK>([]);
  const [estDeck, setEstDeck] = useState<typeof EST_BANK>([]);

  useEffect(() => {
    store.list<HighScore>('highscores').then(setScores);
  }, [store]);

  function bestFor(game: GameId): HighScore | undefined {
    return scores?.find((s) => s.data.game === game)?.data;
  }

  function start(game: GameId) {
    if (game === 'math-sprint') setMathQ(makeMathQ());
    if (game === 'odd-one-out') setOddDeck(shuffle(ODD_BANK).slice(0, ROUNDS));
    if (game === 'estimate-it') setEstDeck(shuffle(EST_BANK).slice(0, ROUNDS));
    setRun({ game, round: 0, score: 0, feedback: null });
  }

  async function finishRun(finalScore: number, game: GameId) {
    const existing = scores?.find((s) => s.data.game === game);
    if (existing) {
      const updated = await store.update('highscores', existing.docId, { game, best: Math.max(existing.data.best, finalScore), plays: existing.data.plays + 1 });
      setScores((prev) => (prev ?? []).map((s) => (s.docId === existing.docId ? updated : s)));
    } else {
      const doc = await store.create('highscores', { game, best: finalScore, plays: 1 });
      setScores((prev) => [...(prev ?? []), doc]);
    }
  }

  async function answer(correct: boolean, explanation: string) {
    if (!run) return;
    const score = run.score + (correct ? 1 : 0);
    const round = run.round + 1;
    const feedback = correct ? '✅ Correct!' : `⛔ ${explanation}`;
    if (round >= ROUNDS) {
      await finishRun(score, run.game);
      setRun({ ...run, round, score, feedback: `${feedback} — Run over: ${score}/${ROUNDS}` });
    } else {
      if (run.game === 'math-sprint') setMathQ(makeMathQ());
      setRun({ game: run.game, round, score, feedback });
    }
  }

  function exportScores() {
    const rows = (scores ?? []).map((s) => `${s.data.game},${s.data.best},${s.data.plays}`);
    const csv = ['game,best score,plays', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'arcade-scores.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (scores === null) return <LoadingState />;

  const gameOver = run && run.round >= ROUNDS;

  return (
    <div className="module-card" data-testid="educational-minigame-arcade-root">
      <Section title="Arcade Cabinet">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          {GAMES.map((g) => {
            const hs = bestFor(g.id);
            return (
              <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))' }} data-testid={`cabinet-${g.id}`}>
                <div style={{ fontSize: 24 }}>{g.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>{g.teaches}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--module-accent)', fontVariantNumeric: 'tabular-nums' }} data-testid={`best-${g.id}`}>
                  {hs ? `🏆 Best ${hs.best}/${ROUNDS} · ${hs.plays} plays` : 'No runs yet'}
                </div>
                <Button variant="primary" onClick={() => start(g.id)} data-testid={`play-${g.id}`} style={{ marginTop: 'auto' }}>
                  ▶ Play
                </Button>
              </div>
            );
          })}
        </div>
      </Section>

      {run && (
        <>
          <Divider />
          <Section title={GAMES.find((g) => g.id === run.game)!.name}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="game-panel">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag active>Round {Math.min(run.round + 1, ROUNDS)} / {ROUNDS}</Tag>
                <Tag>Score {run.score}</Tag>
              </div>

              {!gameOver && run.game === 'math-sprint' && mathQ && (
                <>
                  <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0, fontVariantNumeric: 'tabular-nums' }} data-testid="math-prompt">
                    {mathQ.prompt} = ?
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {mathQ.options.map((o, i) => (
                      <Button key={i} variant="secondary" onClick={() => answer(o === mathQ.answer, `It was ${mathQ.answer}.`)} data-testid={`math-option-${i}`} style={{ minWidth: 80, fontVariantNumeric: 'tabular-nums' }}>
                        {o}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {!gameOver && run.game === 'odd-one-out' && oddDeck[run.round] && (
                <>
                  <p style={{ fontSize: 14, color: 'var(--color-text-dim)', margin: 0 }}>Which one doesn't belong?</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {oddDeck[run.round]!.words.map((w, i) => (
                      <Button key={w} variant="secondary" onClick={() => answer(i === oddDeck[run.round]!.oddIndex, `They're ${oddDeck[run.round]!.category}.`)} data-testid={`odd-option-${i}`}>
                        {w}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {!gameOver && run.game === 'estimate-it' && estDeck[run.round] && (
                <>
                  <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', margin: 0 }} data-testid="est-prompt">
                    {estDeck[run.round]!.question}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {estDeck[run.round]!.options.map((o, i) => (
                      <Button key={o} variant="secondary" onClick={() => answer(i === estDeck[run.round]!.answerIndex, `It's ${estDeck[run.round]!.options[estDeck[run.round]!.answerIndex]}.`)} data-testid={`est-option-${i}`}>
                        {o}
                      </Button>
                    ))}
                  </div>
                </>
              )}

              {run.feedback && (
                <span style={{ fontSize: 13, color: run.feedback.startsWith('✅') ? '#39d98a' : '#ff9f0a' }} data-testid="feedback">
                  {run.feedback}
                </span>
              )}

              {gameOver && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="primary" onClick={() => start(run.game)} data-testid="play-again-button">
                    🔁 Play Again
                  </Button>
                  <Button variant="ghost" onClick={() => setRun(null)} data-testid="back-button">
                    ← Back to Arcade
                  </Button>
                </div>
              )}
            </div>
          </Section>
        </>
      )}

      <Divider />

      <Section title="High Scores">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 14 }}>
          {GAMES.map((g) => {
            const hs = bestFor(g.id);
            return <StatDisplay key={g.id} value={hs ? `${hs.best}/${ROUNDS}` : '—'} label={`${g.name} best`} />;
          })}
        </div>
        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportScores}>
          ⬇️ Export Scores as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
