import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Interview Prep Simulator for a Specific Role — build a role-specific
// question bank, run practice reps (least-practiced question first, so
// the rotation covers the whole bank), and self-rate each answer 1–5.
// The self-evaluation scores drive the weakest-category readout. This is
// deliberately self-scored — AI mock-interview feedback is a Phase 7
// module, not this one.

type Question = { prompt: string; category: string; attempts: number; lastRating: number };
type Profile = { role: string };

const CATEGORIES = ['Behavioral', 'Technical', 'Situational'];
const RATING_LABELS = ['Rough', 'Shaky', 'Okay', 'Solid', 'Nailed It'];

export function InterviewPrepSimulatorForASpecificRole({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [questions, setQuestions] = useState<StoreDoc<Question>[] | null>(null);
  const [profile, setProfile] = useState<StoreDoc<Profile> | null | undefined>(undefined);
  const [practicing, setPracticing] = useState<StoreDoc<Question> | null>(null);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('Behavioral');
  const [roleDraft, setRoleDraft] = useState('');
  const [editingRole, setEditingRole] = useState(false);

  useEffect(() => {
    store.list<Question>('questions').then(setQuestions);
    store.list<Profile>('profile').then((docs) => setProfile(docs[0] ?? null));
  }, [store]);

  const list = questions ?? [];
  const practiced = list.filter((q) => q.data.attempts > 0);
  const avgRating = practiced.length > 0 ? practiced.reduce((s, q) => s + q.data.lastRating, 0) / practiced.length : 0;

  const weakestCategory = useMemo(() => {
    let worst: { cat: string; avg: number } | null = null;
    for (const cat of CATEGORIES) {
      const rated = practiced.filter((q) => q.data.category === cat);
      if (rated.length === 0) continue;
      const avg = rated.reduce((s, q) => s + q.data.lastRating, 0) / rated.length;
      if (!worst || avg < worst.avg) worst = { cat, avg };
    }
    return worst;
  }, [practiced]);

  function drawQuestion() {
    if (list.length === 0) return;
    // least-practiced first; ties broken by weakest last rating
    const sorted = [...list].sort((a, b) => a.data.attempts - b.data.attempts || a.data.lastRating - b.data.lastRating);
    setPracticing(sorted[0]!);
  }

  async function rateAnswer(rating: number) {
    if (!practicing) return;
    const next: Question = { ...practicing.data, attempts: practicing.data.attempts + 1, lastRating: rating };
    const updated = await store.update('questions', practicing.docId, next);
    setQuestions((prev) => (prev ?? []).map((q) => (q.docId === practicing.docId ? updated : q)));
    setPracticing(null);
  }

  async function addQuestion() {
    if (!prompt.trim()) return;
    const doc = await store.create('questions', { prompt: prompt.trim(), category, attempts: 0, lastRating: 0 });
    setQuestions((prev) => [...(prev ?? []), doc]);
    setPrompt('');
  }

  async function removeQuestion(docId: string) {
    await store.remove('questions', docId);
    setQuestions((prev) => (prev ?? []).filter((q) => q.docId !== docId));
    if (practicing?.docId === docId) setPracticing(null);
  }

  async function saveRole() {
    const role = roleDraft.trim();
    if (!role) return;
    if (profile) {
      const updated = await store.update('profile', profile.docId, { role });
      setProfile(updated);
    } else {
      const doc = await store.create('profile', { role });
      setProfile(doc);
    }
    setEditingRole(false);
  }

  function exportBank() {
    const rows = list.map((q) => `"${q.data.prompt.replace(/"/g, '""')}",${q.data.category},${q.data.attempts},${q.data.lastRating || ''}`);
    const csv = ['question,category,attempts,last self-rating', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'interview-question-bank.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (questions === null || profile === undefined) return <LoadingState />;

  return (
    <div className="module-card" data-testid="interview-prep-simulator-root">
      <Section title="Prep Overview">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Preparing For:</span>
          {editingRole ? (
            <>
              <Input value={roleDraft} onChange={(e) => setRoleDraft(e.target.value)} placeholder="e.g. Product Manager" data-testid="role-input" style={{ width: 220 }} />
              <Button variant="secondary" onClick={saveRole} data-testid="save-role-button" style={{ padding: '5px 10px', fontSize: 12 }}>
                Save
              </Button>
            </>
          ) : (
            <Tag active onClick={() => { setRoleDraft(profile?.data.role ?? ''); setEditingRole(true); }}>
              🎯 {profile?.data.role ?? 'Set Your Target Role'}
            </Tag>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="practiced-count">{`${practiced.length} / ${list.length}`}</span>} label="Questions practiced" />
          <StatDisplay value={avgRating > 0 ? avgRating.toFixed(1) : '—'} label="Average self-rating (of 5)" />
          <StatDisplay value={weakestCategory ? weakestCategory.cat : '—'} label={weakestCategory ? `Weakest area · avg ${weakestCategory.avg.toFixed(1)}` : 'Weakest area'} />
        </div>
      </Section>

      <Divider />

      <Section title="Practice Rep">
        {practicing ? (
          <div data-testid="practice-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Tag>{practicing.data.category}</Tag>
            <p style={{ fontSize: 16, color: 'var(--color-text)', fontWeight: 600, margin: 0, lineHeight: 1.5 }} data-testid="practice-prompt">
              {practicing.data.prompt}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }}>
              Answer out loud like it's the real thing — then rate yourself honestly.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {RATING_LABELS.map((label, i) => (
                <Button key={label} variant={i >= 3 ? 'secondary' : 'ghost'} onClick={() => rateAnswer(i + 1)} data-testid={`rate-${i + 1}`} style={{ padding: '6px 12px', fontSize: 12 }}>
                  {i + 1} · {label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={drawQuestion} data-testid="draw-button" disabled={list.length === 0}>
              🎤 Draw a Question
            </Button>
            <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>Pulls your least-practiced question first, so the whole bank gets reps.</span>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Question Bank">
        {list.length === 0 ? (
          <EmptyState icon="🎤">No questions yet — add the ones you expect to get.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="questions-list">
            {list.map((q) => (
              <div key={q.docId} className="module-list-row" data-testid="question-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{q.data.prompt}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {q.data.category} · {q.data.attempts === 0 ? 'not practiced yet' : `${q.data.attempts} ${q.data.attempts === 1 ? 'rep' : 'reps'}`}
                  </div>
                </div>
                {q.data.lastRating > 0 && (
                  <Tag active={q.data.lastRating >= 4}>
                    {q.data.lastRating >= 4 ? '💪' : q.data.lastRating >= 3 ? '🙂' : '📉'} {q.data.lastRating}/5
                  </Tag>
                )}
                <IconButton label="Remove" onClick={() => removeQuestion(q.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Label>Question</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Why do you want this role?" data-testid="prompt-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Category</Label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-select" style={{ width: '100%' }}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="primary" onClick={addQuestion} data-testid="add-question-button">
            + Add Question
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportBank}>
          ⬇️ Export Question Bank as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
