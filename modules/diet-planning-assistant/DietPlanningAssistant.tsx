import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Diet Planning Assistant — describe what you ate in plain words and the
// proxy estimates CALORIES | PROTEIN | one honest note; the daily totals
// and a logging-streak reward (the catalog's "rewards") are computed
// locally. A recipe generator suggests the next meal from your goal and
// what you've already eaten today. Estimates only, not medical or
// dietetic advice — the UI says so. CONTRACT.md #11 states rendered.

type Meal = { date: string; description: string; calories: number; proteinG: number; note: string };
type Recipe = { title: string; body: string };

const ANALYZE_SYSTEM = [
  'You estimate nutrition from meal descriptions. Output exactly one line:',
  'CALORIES (integer) | PROTEIN_G (integer) | NOTE (one honest, non-judgmental sentence about the meal)',
  'Ballpark typical portions. Never shame, never diagnose, never mention weight loss unless asked. No headers, no commentary.',
].join(' ');

const RECIPE_SYSTEM = [
  'You are a practical cook suggesting one recipe. Output: first line the recipe name, then 2-3 sentences covering method, key ingredients, rough protein, and time.',
  'Everyday ingredients, under 30 minutes. No headers, no lists.',
].join(' ');

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function streakFrom(dates: Set<string>): number {
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (dates.has(d)) streak++;
    else if (i === 0) continue; // today not logged yet doesn't break the streak
    else break;
  }
  return streak;
}

export function DietPlanningAssistant({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [meals, setMeals] = useState<StoreDoc<Meal>[] | null>(null);
  const [recipes, setRecipes] = useState<StoreDoc<Recipe>[] | null>(null);
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('more protein, less sugar');
  const [working, setWorking] = useState<'analyze' | 'recipe' | null>(null);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Meal>('meals').then(setMeals);
    store.list<Recipe>('recipes').then(setRecipes);
  }, [store]);

  const mealList = meals ?? [];
  const today = mealList.filter((m) => m.data.date === todayStr());
  const todayCalories = today.reduce((s, m) => s + m.data.calories, 0);
  const todayProtein = today.reduce((s, m) => s + m.data.proteinG, 0);
  const streak = useMemo(() => streakFrom(new Set(mealList.map((m) => m.data.date))), [mealList]);

  async function analyzeMeal() {
    if (!ai || working || description.trim().length < 5) return;
    setWorking('analyze');
    setFailure(null);
    const res = await ai.complete({ system: ANALYZE_SYSTEM, prompt: `Meal: ${description.trim()}`, maxTokens: 200 });
    setWorking(null);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const line = res.text.split('\n').find((l) => l.includes('|'));
    if (!line) return;
    const [cal = '0', protein = '0', ...rest] = line.split('|').map((p) => p.trim());
    const meal: Meal = {
      date: todayStr(),
      description: description.trim(),
      calories: Math.max(0, parseInt(cal.replace(/\D/g, ''), 10) || 0),
      proteinG: Math.max(0, parseInt(protein.replace(/\D/g, ''), 10) || 0),
      note: rest.join(' | ') || '—',
    };
    const doc = await store.create('meals', meal);
    setMeals((prev) => [doc, ...(prev ?? [])]);
    setDescription('');
  }

  async function suggestRecipe() {
    if (!ai || working) return;
    setWorking('recipe');
    setFailure(null);
    const eaten = today.map((m) => m.data.description).join('; ');
    const prompt = `My goal: ${goal.trim() || 'balanced eating'}. ${eaten ? `Already eaten today: ${eaten}.` : 'Nothing logged yet today.'} Suggest one dinner recipe.`;
    const res = await ai.complete({ system: RECIPE_SYSTEM, prompt, maxTokens: 300 });
    setWorking(null);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const [title, ...body] = res.text.trim().split('\n');
    const doc = await store.create('recipes', { title: (title || 'Suggested Recipe').replace(/^#+\s*/, ''), body: body.join('\n').trim() || res.text.trim() });
    setRecipes((prev) => [doc, ...(prev ?? [])]);
  }

  async function removeMeal(docId: string) {
    await store.remove('meals', docId);
    setMeals((prev) => (prev ?? []).filter((m) => m.docId !== docId));
  }

  async function removeRecipe(docId: string) {
    await store.remove('recipes', docId);
    setRecipes((prev) => (prev ?? []).filter((r) => r.docId !== docId));
  }

  function exportDiary() {
    const rows = mealList.map((m) => `${m.data.date},"${m.data.description.replace(/"/g, '""')}",${m.data.calories},${m.data.proteinG},"${m.data.note.replace(/"/g, '""')}"`);
    const csv = ['date,meal,calories (est),protein g (est),note', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'food-diary.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (meals === null || recipes === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="diet-planning-assistant-root">
      <Section title="Today">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 6 }}>
          <StatDisplay value={<span data-testid="today-calories">{todayCalories}</span>} label="Calories today (est)" />
          <StatDisplay value={`${todayProtein}g`} label="Protein today (est)" />
          <StatDisplay value={<span data-testid="streak-value">🔥 {streak}</span>} label={`Day logging streak${streak >= 7 ? ' — on fire!' : ''}`} />
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-dim)', margin: 0 }}>Estimates from descriptions — a habit mirror, not medical or dietetic advice.</p>
      </Section>

      <Divider />

      <Section title="Log a Meal">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Label>What Did You Eat?</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && analyzeMeal()}
                placeholder="e.g. Turkey sandwich on wheat with chips"
                data-testid="meal-input"
                style={{ width: '100%' }}
              />
            </div>
            <Button variant="primary" onClick={analyzeMeal} data-testid="analyze-button" disabled={working !== null || description.trim().length < 5}>
              {working === 'analyze' ? 'Analyzing…' : 'Log & Analyze'}
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Label>Eating Goal</Label>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. more fiber" data-testid="goal-input" style={{ width: '100%' }} />
            </div>
            <Button variant="secondary" onClick={suggestRecipe} data-testid="recipe-button" disabled={working !== null}>
              {working === 'recipe' ? 'Thinking…' : 'Suggest Tonight\'s Recipe'}
            </Button>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'call' : 'calls'} left in preview — unlock the app for every meal.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Analysis needs an account, even to try it — sign in for a few free meals.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free analyses are used up — unlock the app to keep the diary going.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The assistant is offline right now — your diary is intact, try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Food Diary">
        {mealList.length === 0 ? (
          <EmptyState icon="🥑">Nothing logged — describe your last meal above.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="meals-list">
            {mealList.map((m) => (
              <div key={m.docId} className="module-list-row" data-testid="meal-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{m.data.description}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {m.data.date} · {m.data.note}
                  </div>
                </div>
                <Tag>~{m.data.calories} cal</Tag>
                <Tag active>{m.data.proteinG}g protein</Tag>
                <IconButton label="Remove" onClick={() => removeMeal(m.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        {recipes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="recipes-list">
            <Label>Suggested Recipes</Label>
            {recipes.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="recipe-item" style={{ alignItems: 'flex-start' }}>
                <span style={{ minWidth: 24 }}>👩‍🍳</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.title}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)', lineHeight: 1.6 }}>{r.data.body}</div>
                </div>
                <IconButton label="Remove" onClick={() => removeRecipe(r.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportDiary}>
          Export Food Diary as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
