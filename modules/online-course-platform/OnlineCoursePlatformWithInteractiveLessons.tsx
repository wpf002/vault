import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Online Course Platform with Interactive Lessons — author courses as an
// ordered mix of reading lessons and checkpoint quizzes, then take them:
// readings complete on "Mark Read", quizzes only complete on the correct
// answer (wrong answers stay open). Scope note: video hosting is a
// file-blob/CDN integration — lesson types here are reading and quiz,
// which is where the interactivity actually lives.

type Lesson = { title: string; kind: 'reading' | 'quiz'; body: string; question: string; options: string[]; answerIndex: number; completed: boolean };
type Course = { title: string; lessons: Lesson[] };

export function OnlineCoursePlatformWithInteractiveLessons({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [courses, setCourses] = useState<StoreDoc<Course>[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [quizResult, setQuizResult] = useState<Record<number, 'correct' | 'wrong'>>({});
  const [courseTitle, setCourseTitle] = useState('');
  const [lTitle, setLTitle] = useState('');
  const [lKind, setLKind] = useState<Lesson['kind']>('reading');
  const [lBody, setLBody] = useState('');
  const [lQuestion, setLQuestion] = useState('');
  const [lOptions, setLOptions] = useState('');
  const [lAnswer, setLAnswer] = useState('1');

  useEffect(() => {
    store.list<Course>('courses').then((docs) => {
      setCourses(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
  }, [store]);

  const selected = (courses ?? []).find((c) => c.docId === selectedId) ?? null;
  const lessons = selected?.data.lessons ?? [];
  const doneCount = lessons.filter((l) => l.completed).length;
  const progressPct = lessons.length > 0 ? (doneCount / lessons.length) * 100 : 0;

  async function saveLessons(nextLessons: Lesson[]) {
    if (!selected) return;
    const updated = await store.update('courses', selected.docId, { ...selected.data, lessons: nextLessons });
    setCourses((prev) => (prev ?? []).map((c) => (c.docId === selected.docId ? updated : c)));
  }

  async function markRead(i: number) {
    await saveLessons(lessons.map((l, idx) => (idx === i ? { ...l, completed: true } : l)));
    setOpenLesson(null);
  }

  async function answerQuiz(i: number, choice: number) {
    const lesson = lessons[i]!;
    if (choice === lesson.answerIndex) {
      setQuizResult((prev) => ({ ...prev, [i]: 'correct' }));
      await saveLessons(lessons.map((l, idx) => (idx === i ? { ...l, completed: true } : l)));
    } else {
      setQuizResult((prev) => ({ ...prev, [i]: 'wrong' }));
    }
  }

  async function createCourse() {
    if (!courseTitle.trim()) return;
    const doc = await store.create('courses', { title: courseTitle.trim(), lessons: [] });
    setCourses((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setCourseTitle('');
  }

  async function removeCourse(docId: string) {
    await store.remove('courses', docId);
    setCourses((prev) => {
      const next = (prev ?? []).filter((c) => c.docId !== docId);
      if (selectedId === docId) setSelectedId(next[0]?.docId ?? '');
      return next;
    });
  }

  async function addLesson() {
    if (!selected || !lTitle.trim()) return;
    const options = lOptions.split(',').map((o) => o.trim()).filter(Boolean);
    if (lKind === 'quiz' && (!lQuestion.trim() || options.length < 2)) return;
    const lesson: Lesson = {
      title: lTitle.trim(),
      kind: lKind,
      body: lKind === 'reading' ? lBody.trim() : '',
      question: lKind === 'quiz' ? lQuestion.trim() : '',
      options: lKind === 'quiz' ? options : [],
      answerIndex: lKind === 'quiz' ? Math.min(options.length - 1, Math.max(0, Math.round(Number(lAnswer) || 1) - 1)) : 0,
      completed: false,
    };
    await saveLessons([...lessons, lesson]);
    setLTitle('');
    setLBody('');
    setLQuestion('');
    setLOptions('');
    setLAnswer('1');
  }

  async function removeLesson(i: number) {
    await saveLessons(lessons.filter((_, idx) => idx !== i));
    if (openLesson === i) setOpenLesson(null);
  }

  function exportCourse() {
    if (!selected) return;
    const lines = selected.data.lessons.map((l, i) => {
      if (l.kind === 'quiz') return `## ${i + 1}. ${l.title} (Quiz)\n\n**${l.question}**\n${l.options.map((o, j) => `- ${j === l.answerIndex ? '**' + o + '** ✓' : o}`).join('\n')}`;
      return `## ${i + 1}. ${l.title}\n\n${l.body}`;
    });
    const md = [`# ${selected.data.title}`, '', ...lines].join('\n\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'course-outline.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (courses === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="online-course-platform-root">
      <Section title="Course Progress">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          {courses.length > 0 && (
            <div style={{ width: 260 }}>
              <Label>Course</Label>
              <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setOpenLesson(null); setQuizResult({}); }} data-testid="course-select" style={{ width: '100%' }}>
                {courses.map((c) => (
                  <option key={c.docId} value={c.docId}>
                    {c.data.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>New Course</Label>
            <Input value={courseTitle} onChange={(e) => setCourseTitle(e.target.value)} placeholder="e.g. Intro to Photography" data-testid="course-title-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={createCourse} data-testid="create-course-button">
            + Create
          </Button>
          {selected && (
            <Button variant="ghost" onClick={() => removeCourse(selected.docId)} data-testid="delete-course-button">
              🗑️
            </Button>
          )}
        </div>
        {selected && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
              <StatDisplay value={<span data-testid="progress-value">{`${doneCount} / ${lessons.length}`}</span>} label="Lessons completed" />
              <StatDisplay value={`${progressPct.toFixed(0)}%`} label="Course progress" />
              <StatDisplay value={lessons.filter((l) => l.kind === 'quiz').length} label="Checkpoint quizzes" />
            </div>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--module-accent)', borderRadius: 4, transition: 'width 200ms' }} data-testid="progress-bar" />
            </div>
          </>
        )}
      </Section>

      {selected && (
        <>
          <Divider />
          <Section title="Lessons">
            {lessons.length === 0 ? (
              <EmptyState icon="🎓">No lessons yet — build the course below.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="lessons-list">
                {lessons.map((l, i) => (
                  <div key={i} className="module-list-row" data-testid="lesson-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ minWidth: 24 }}>{l.completed ? '✅' : l.kind === 'quiz' ? '🧩' : '📖'}</span>
                      <div className="module-list-row-content" style={{ flex: 1 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                          {i + 1}. {l.title}
                        </span>
                      </div>
                      <Tag active={l.completed}>{l.completed ? 'Done' : l.kind === 'quiz' ? 'Quiz' : 'Reading'}</Tag>
                      <Button variant="secondary" onClick={() => setOpenLesson(openLesson === i ? null : i)} data-testid={`open-lesson-${i}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                        {openLesson === i ? 'Close' : l.completed ? 'Review' : 'Start'}
                      </Button>
                      <IconButton label="Remove" onClick={() => removeLesson(i)}>
                        ✕
                      </IconButton>
                    </div>
                    {openLesson === i && (
                      <div style={{ padding: '4px 8px 4px 32px', display: 'flex', flexDirection: 'column', gap: 10 }} data-testid={`lesson-body-${i}`}>
                        {l.kind === 'reading' ? (
                          <>
                            <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-text)', margin: 0 }}>{l.body}</p>
                            {!l.completed && (
                              <Button variant="primary" onClick={() => markRead(i)} data-testid={`mark-read-${i}`} style={{ alignSelf: 'flex-start' }}>
                                ✓ Mark Read
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>{l.question}</p>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {l.options.map((o, j) => (
                                <Button key={j} variant="secondary" onClick={() => answerQuiz(i, j)} data-testid={`answer-${i}-${j}`} style={{ padding: '6px 12px', fontSize: 13 }} disabled={l.completed}>
                                  {o}
                                </Button>
                              ))}
                            </div>
                            {quizResult[i] === 'wrong' && (
                              <span style={{ fontSize: 12, color: '#ff6b5e' }} data-testid={`quiz-wrong-${i}`}>
                                ⛔ Not quite — try again.
                              </span>
                            )}
                            {(quizResult[i] === 'correct' || l.completed) && (
                              <span style={{ fontSize: 12, color: '#39d98a' }} data-testid={`quiz-correct-${i}`}>
                                ✅ Correct — checkpoint passed.
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <Label>Lesson Title</Label>
                  <Input value={lTitle} onChange={(e) => setLTitle(e.target.value)} placeholder="e.g. Aperture Basics" data-testid="lesson-title-input" style={{ width: '100%' }} />
                </div>
                <div style={{ width: 120 }}>
                  <Label>Type</Label>
                  <Select value={lKind} onChange={(e) => setLKind(e.target.value as Lesson['kind'])} data-testid="lesson-kind-select" style={{ width: '100%' }}>
                    <option value="reading">Reading</option>
                    <option value="quiz">Quiz</option>
                  </Select>
                </div>
                <Button variant="primary" onClick={addLesson} data-testid="add-lesson-button">
                  + Add Lesson
                </Button>
              </div>
              {lKind === 'reading' ? (
                <Textarea value={lBody} onChange={(e) => setLBody(e.target.value)} placeholder="Lesson content…" data-testid="lesson-body-input" rows={3} style={{ width: '100%' }} />
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Label>Question</Label>
                    <Input value={lQuestion} onChange={(e) => setLQuestion(e.target.value)} placeholder="e.g. A wider aperture means…" data-testid="quiz-question-input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <Label>Options (Comma-Separated)</Label>
                    <Input value={lOptions} onChange={(e) => setLOptions(e.target.value)} placeholder="More light, Less light" data-testid="quiz-options-input" style={{ width: '100%' }} />
                  </div>
                  <div style={{ width: 130 }}>
                    <Label>Correct Option #</Label>
                    <Input type="number" value={lAnswer} onChange={(e) => setLAnswer(e.target.value)} data-testid="quiz-answer-input" style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </div>

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportCourse}>
              ⬇️ Export Course Outline as Markdown
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
