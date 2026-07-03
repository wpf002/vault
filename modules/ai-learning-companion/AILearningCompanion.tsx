import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Learning Companion — the "adapts to you" loop is real: every lesson
// you rate (got it / shaky / lost) goes back into the next lesson's
// prompt, so the companion slows down, re-explains, or accelerates based
// on your actual track record, in your preferred style (examples-first,
// theory-first, or practice-first). Proxy-only per CONTRACT.md #11.

type Profile = { subject: string; level: string; style: 'examples_first' | 'theory_first' | 'practice_first' };
type Lesson = { topic: string; body: string; grade: 'got_it' | 'shaky' | 'lost' | 'ungraded' };

const STYLE_META: Record<Profile['style'], { label: string; instruction: string }> = {
  examples_first: { label: '🧪 Examples First', instruction: 'Lead with a concrete, everyday example, then name the concept it illustrates.' },
  theory_first: { label: '📐 Theory First', instruction: 'Define the concept precisely first, then ground it with one example.' },
  practice_first: { label: '✍️ Practice First', instruction: 'Open with a small problem for the learner to think about, then walk through the solution.' },
};

const GRADE_META: Record<Exclude<Lesson['grade'], 'ungraded'>, string> = { got_it: '✅ Got It', shaky: '🟡 Shaky', lost: '🔴 Lost' };

function buildSystem(p: Profile): string {
  return [
    `You are a patient tutor teaching ${p.subject} to a ${p.level.toLowerCase()} learner.`,
    STYLE_META[p.style].instruction,
    'Write ONE micro-lesson: 4-7 sentences, plain text, no headers, no lists.',
    'If the learner history shows "shaky" or "lost" topics, briefly reinforce those ideas before advancing; if everything is "got it", raise the difficulty a notch.',
  ].join(' ');
}

export function AILearningCompanion({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [profile, setProfile] = useState<StoreDoc<Profile> | null | undefined>(undefined);
  const [lessons, setLessons] = useState<StoreDoc<Lesson>[] | null>(null);
  const [draft, setDraft] = useState<Profile>({ subject: '', level: 'Beginner', style: 'examples_first' });
  const [editing, setEditing] = useState(false);
  const [topic, setTopic] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Profile>('profile').then((docs) => setProfile(docs[0] ?? null));
    store.list<Lesson>('lessons').then(setLessons);
  }, [store]);

  const p = profile?.data;
  const lessonList = lessons ?? [];
  const gotIt = lessonList.filter((l) => l.data.grade === 'got_it').length;

  async function saveProfile() {
    if (!draft.subject.trim()) return;
    if (profile) {
      const updated = await store.update('profile', profile.docId, draft);
      setProfile(updated);
    } else {
      const doc = await store.create('profile', draft);
      setProfile(doc);
    }
    setEditing(false);
  }

  async function teach() {
    if (!ai || working || !p) return;
    setWorking(true);
    setFailure(null);
    const history = lessonList
      .slice(0, 6)
      .map((l) => `"${l.data.topic}" → ${l.data.grade.replace('_', ' ')}`)
      .join('; ');
    const prompt = [
      topic.trim() ? `Teach me: ${topic.trim()}.` : `Pick the next most useful ${p.subject} topic for me and teach it.`,
      history ? `My recent track record: ${history}.` : 'This is my first lesson.',
    ].join(' ');
    const res = await ai.complete({ system: buildSystem(p), prompt, maxTokens: 450 });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const firstLine = topic.trim() || `${p.subject} — lesson ${lessonList.length + 1}`;
    const newLesson: Lesson = { topic: firstLine, body: res.text.trim(), grade: 'ungraded' };
    const doc = await store.create('lessons', newLesson);
    setLessons((prev) => [doc, ...(prev ?? [])]);
    setTopic('');
  }

  async function grade(doc: StoreDoc<Lesson>, g: Exclude<Lesson['grade'], 'ungraded'>) {
    const next: Lesson = { ...doc.data, grade: g };
    const updated = await store.update('lessons', doc.docId, next);
    setLessons((prev) => (prev ?? []).map((l) => (l.docId === doc.docId ? updated : l)));
  }

  async function removeLesson(docId: string) {
    await store.remove('lessons', docId);
    setLessons((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  function exportNotebook() {
    const lines = [...lessonList].reverse().map((l) => `## ${l.data.topic}\n\n${l.data.body}\n\n_Self-check: ${l.data.grade.replace('_', ' ')}_`);
    const md = [`# ${p?.subject ?? 'Learning'} Notebook`, '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'learning-notebook.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (profile === undefined || lessons === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="ai-learning-companion-root">
      <Section title="Your Learning Setup">
        {p && !editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid="profile-summary">
            <Tag active>📚 {p.subject}</Tag>
            <Tag>{p.level}</Tag>
            <Tag>{STYLE_META[p.style].label}</Tag>
            <Button variant="ghost" onClick={() => { setDraft(p); setEditing(true); }} data-testid="edit-profile-button" style={{ padding: '5px 10px', fontSize: 12 }}>
              ✏️ Edit
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }} data-testid="profile-editor">
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Subject</Label>
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="e.g. Music theory" data-testid="subject-input" style={{ width: '100%' }} />
            </div>
            <div style={{ width: 140 }}>
              <Label>Level</Label>
              <Select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} data-testid="level-select" style={{ width: '100%' }}>
                {['Beginner', 'Intermediate', 'Advanced'].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div style={{ width: 170 }}>
              <Label>Learning Style</Label>
              <Select value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value as Profile['style'] })} data-testid="style-select" style={{ width: '100%' }}>
                {(Object.keys(STYLE_META) as Profile['style'][]).map((s) => (
                  <option key={s} value={s}>
                    {STYLE_META[s].label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="primary" onClick={saveProfile} data-testid="save-profile-button">
              💾 Save
            </Button>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Next Lesson">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Label>Topic (Blank = Companion Picks)</Label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Confidence intervals" data-testid="topic-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={teach} data-testid="teach-button" disabled={working || !p}>
              {working ? '🧑‍🏫 Preparing…' : '🧑‍🏫 Teach Me'}
            </Button>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'lesson' : 'lessons'} left in preview — unlock the app for unlimited tutoring.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 The companion needs an account, even to try it — sign in for a few free lessons.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free lessons are used up — unlock the app to keep learning.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The companion is offline right now — try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Lesson History">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="lesson-count">{lessonList.length}</span>} label="Lessons taken" />
          <StatDisplay value={gotIt} label="Solid" />
          <StatDisplay value={lessonList.filter((l) => l.data.grade === 'shaky' || l.data.grade === 'lost').length} label="Needs reinforcement" />
        </div>

        {lessonList.length === 0 ? (
          <EmptyState icon="🧑‍🏫">No lessons yet — your first one shapes all the rest.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="lessons-list">
            {lessonList.map((l) => (
              <div key={l.docId} className="module-list-row" data-testid="lesson-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{l.data.topic}</span>
                  </div>
                  {l.data.grade === 'ungraded' ? (
                    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }} data-testid={`grade-row-${l.docId}`}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>How did it land?</span>
                      {(Object.keys(GRADE_META) as Exclude<Lesson['grade'], 'ungraded'>[]).map((g) => (
                        <Button key={g} variant="ghost" onClick={() => grade(l, g)} data-testid={`grade-${l.docId}-${g}`} style={{ padding: '3px 8px', fontSize: 12 }}>
                          {GRADE_META[g]}
                        </Button>
                      ))}
                    </span>
                  ) : (
                    <Tag active={l.data.grade === 'got_it'}>{GRADE_META[l.data.grade as Exclude<Lesson['grade'], 'ungraded'>]}</Tag>
                  )}
                  <IconButton label="Remove" onClick={() => removeLesson(l.docId)}>
                    ✕
                  </IconButton>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-dim)', marginLeft: 4, whiteSpace: 'pre-wrap' }}>{l.data.body}</div>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportNotebook}>
          ⬇️ Export Notebook as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
