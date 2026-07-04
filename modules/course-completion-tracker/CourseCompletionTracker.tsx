import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Course Completion Tracker — creator analytics: per-lesson learner counts
// form a funnel; the biggest reached→completed gap is flagged as the
// drop-off point the catalog blurb promises. Scope note: pulling counts
// straight from an LMS is a third-party integration; you log the per-
// lesson numbers, the funnel math is here.

type Lesson = { course: string; order: number; title: string; learnersReached: number; learnersCompleted: number };

export function CourseCompletionTracker({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [lessons, setLessons] = useState<StoreDoc<Lesson>[] | null>(null);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [reached, setReached] = useState('');
  const [completed, setCompleted] = useState('');

  useEffect(() => {
    store.list<Lesson>('lessons').then((docs) => {
      setLessons(docs.sort((a, b) => a.data.order - b.data.order));
      const first = docs[0]?.data.course;
      if (first) setActiveCourse(first);
    });
  }, [store]);

  const courses = useMemo(() => Array.from(new Set((lessons ?? []).map((l) => l.data.course))).sort(), [lessons]);
  const visible = (lessons ?? []).filter((l) => l.data.course === activeCourse);
  const maxReached = Math.max(1, ...visible.map((l) => l.data.learnersReached));

  const started = visible[0]?.data.learnersReached ?? 0;
  const finished = visible[visible.length - 1]?.data.learnersCompleted ?? 0;
  const completionPct = started ? Math.round((finished / started) * 100) : 0;

  // biggest drop: lesson with the largest reached-completed loss
  const dropOff = visible.reduce<{ docId: string; loss: number } | null>((worst, l) => {
    const loss = l.data.learnersReached - l.data.learnersCompleted;
    return !worst || loss > worst.loss ? { docId: l.docId, loss } : worst;
  }, null);

  async function addLesson() {
    if (!course.trim() || !title.trim()) return;
    const inCourse = (lessons ?? []).filter((l) => l.data.course === course.trim());
    const l: Lesson = { course: course.trim(), order: inCourse.length + 1, title: title.trim(), learnersReached: Number(reached) || 0, learnersCompleted: Number(completed) || 0 };
    const doc = await store.create('lessons', l);
    setLessons((prev) => [...(prev ?? []), doc].sort((a, b) => a.data.order - b.data.order));
    setActiveCourse(l.course);
    setTitle('');
    setReached('');
    setCompleted('');
  }

  async function remove(docId: string) {
    await store.remove('lessons', docId);
    setLessons((prev) => (prev ?? []).filter((l) => l.docId !== docId));
  }

  function exportFunnel() {
    const rows = (lessons ?? []).map((l) => `"${l.data.course}",${l.data.order},"${l.data.title}",${l.data.learnersReached},${l.data.learnersCompleted}`);
    const csv = ['course,order,lesson,reached,completed', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'course-funnel.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (lessons === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="course-completion-tracker-root">
      <Section title="Completion Funnel">
        {courses.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {courses.map((c) => (
              <Tag key={c} active={activeCourse === c} onClick={() => setActiveCourse(c)}>
                {c}
              </Tag>
            ))}
          </div>
        )}

        {visible.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <StatDisplay value={`${completionPct}%`} label={`${finished} of ${started} learners finish the course`} />
          </div>
        )}

        {visible.length === 0 ? (
          <EmptyState icon="🎯">No lessons logged — add the first below.</EmptyState>
        ) : (
          <div data-testid="funnel" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {visible.map((l) => {
              const isDrop = dropOff?.docId === l.docId && dropOff.loss > 0;
              return (
                <div key={l.docId} data-testid="lesson-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-dim)', minWidth: 18, fontVariantNumeric: 'tabular-nums' }}>{l.data.order}.</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: 13, flex: 1 }}>
                      {l.data.title}
                      {isDrop && <Tag active> ⚠️ Biggest Drop-Off</Tag>}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {l.data.learnersCompleted}/{l.data.learnersReached}
                    </span>
                    <IconButton label="Remove" onClick={() => remove(l.docId)}>
                      ✕
                    </IconButton>
                  </div>
                  <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                    <div style={{ width: `${(l.data.learnersCompleted / maxReached) * 100}%`, background: 'var(--module-accent)' }} aria-hidden />
                    <div style={{ width: `${((l.data.learnersReached - l.data.learnersCompleted) / maxReached) * 100}%`, background: 'color-mix(in srgb, var(--module-accent) 25%, transparent)' }} aria-hidden />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportFunnel}>
          Export Funnel as CSV
        </GatedAction>
      </Section>

      <Divider />

      <Section title="Log a Lesson">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Course</Label>
            <Input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Course name" data-testid="lesson-course-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 2, minWidth: 170 }}>
            <Label>Lesson Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Joinery basics" data-testid="lesson-title-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Reached</Label>
            <Input type="number" value={reached} onChange={(e) => setReached(e.target.value)} data-testid="lesson-reached-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Completed</Label>
            <Input type="number" value={completed} onChange={(e) => setCompleted(e.target.value)} data-testid="lesson-completed-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addLesson} data-testid="add-lesson-button">
            + Add
          </Button>
        </div>
      </Section>
    </div>
  );
}
