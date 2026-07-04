import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Skills Assessment Builder — define an assessment as weighted
// competencies, score candidates 1–5 per competency, and read the
// results dashboard (weighted totals per candidate, average per
// competency so you can see where everyone is weak). Weighted total =
// Σ(score × weight) / Σweight, shown out of 5.

type Competency = { name: string; weight: number };
type Assessment = { title: string; competencies: Competency[] };
type Evaluation = { assessmentTitle: string; candidate: string; scores: number[] };

function weightedScore(a: Assessment, scores: number[]): number {
  const totalWeight = a.competencies.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return 0;
  const sum = a.competencies.reduce((s, c, i) => s + (scores[i] ?? 0) * c.weight, 0);
  return sum / totalWeight;
}

export function SkillsAssessmentBuilder({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [assessments, setAssessments] = useState<StoreDoc<Assessment>[] | null>(null);
  const [evaluations, setEvaluations] = useState<StoreDoc<Evaluation>[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [compName, setCompName] = useState('');
  const [compWeight, setCompWeight] = useState('1');
  const [candidate, setCandidate] = useState('');
  const [draftScores, setDraftScores] = useState<number[]>([]);

  useEffect(() => {
    store.list<Assessment>('assessments').then((docs) => {
      setAssessments(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
    store.list<Evaluation>('evaluations').then(setEvaluations);
  }, [store]);

  const selected = (assessments ?? []).find((a) => a.docId === selectedId) ?? null;
  const selectedEvals = (evaluations ?? []).filter((e) => e.data.assessmentTitle === selected?.data.title);
  const ranked = selected ? [...selectedEvals].sort((a, b) => weightedScore(selected.data, b.data.scores) - weightedScore(selected.data, a.data.scores)) : [];

  const competencyAverages = useMemo(() => {
    if (!selected || selectedEvals.length === 0) return [];
    return selected.data.competencies.map((c, i) => ({
      name: c.name,
      avg: selectedEvals.reduce((s, e) => s + (e.data.scores[i] ?? 0), 0) / selectedEvals.length,
    }));
  }, [selected, selectedEvals]);

  const weakest = competencyAverages.length > 0 ? competencyAverages.reduce((w, c) => (c.avg < w.avg ? c : w)) : null;

  async function createAssessment() {
    if (!title.trim()) return;
    const doc = await store.create('assessments', { title: title.trim(), competencies: [] });
    setAssessments((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setTitle('');
  }

  async function addCompetency() {
    if (!selected || !compName.trim()) return;
    const next: Assessment = { ...selected.data, competencies: [...selected.data.competencies, { name: compName.trim(), weight: Math.max(1, Math.round(Number(compWeight) || 1)) }] };
    const updated = await store.update('assessments', selected.docId, next);
    setAssessments((prev) => (prev ?? []).map((a) => (a.docId === selected.docId ? updated : a)));
    setCompName('');
    setCompWeight('1');
  }

  async function removeCompetency(index: number) {
    if (!selected) return;
    const next: Assessment = { ...selected.data, competencies: selected.data.competencies.filter((_, i) => i !== index) };
    const updated = await store.update('assessments', selected.docId, next);
    setAssessments((prev) => (prev ?? []).map((a) => (a.docId === selected.docId ? updated : a)));
  }

  async function removeAssessment(docId: string) {
    await store.remove('assessments', docId);
    setAssessments((prev) => {
      const next = (prev ?? []).filter((a) => a.docId !== docId);
      if (selectedId === docId) setSelectedId(next[0]?.docId ?? '');
      return next;
    });
  }

  function setDraftScore(i: number, v: number) {
    setDraftScores((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
  }

  async function submitEvaluation() {
    if (!selected || !candidate.trim() || selected.data.competencies.length === 0) return;
    if (selected.data.competencies.some((_, i) => !draftScores[i])) return; // every competency must be scored
    const e: Evaluation = { assessmentTitle: selected.data.title, candidate: candidate.trim(), scores: selected.data.competencies.map((_, i) => draftScores[i]!) };
    const doc = await store.create('evaluations', e);
    setEvaluations((prev) => [...(prev ?? []), doc]);
    setCandidate('');
    setDraftScores([]);
  }

  async function removeEvaluation(docId: string) {
    await store.remove('evaluations', docId);
    setEvaluations((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  function exportResults() {
    if (!selected) return;
    const header = ['candidate', ...selected.data.competencies.map((c) => `${c.name} (w${c.weight})`), 'weighted total'].join(',');
    const rows = ranked.map((e) => [`"${e.data.candidate}"`, ...e.data.scores, weightedScore(selected.data, e.data.scores).toFixed(2)].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assessment-results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (assessments === null || evaluations === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="skills-assessment-builder-root">
      <Section title="Results Dashboard">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 4 }}>
          <StatDisplay value={assessments.length} label="Assessments built" />
          <StatDisplay value={<span data-testid="eval-count">{selectedEvals.length}</span>} label="Candidates evaluated" />
          <StatDisplay value={weakest ? weakest.name : '—'} label={weakest ? `Weakest area · avg ${weakest.avg.toFixed(1)}` : 'Weakest area'} />
        </div>
      </Section>

      <Divider />

      <Section title="Assessment">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          {assessments.length > 0 && (
            <div style={{ width: 280 }}>
              <Label>Working On</Label>
              <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setDraftScores([]); }} data-testid="assessment-select" style={{ width: '100%' }}>
                {assessments.map((a) => (
                  <option key={a.docId} value={a.docId}>
                    {a.data.title}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>New Assessment</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Rep Onboarding Check" data-testid="title-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={createAssessment} data-testid="create-assessment-button">
            + Create
          </Button>
          {selected && (
            <Button variant="ghost" onClick={() => removeAssessment(selected.docId)} data-testid="delete-assessment-button">
              Delete
            </Button>
          )}
        </div>

        {selected && (
          <>
            <Label>Rubric — Weighted Competencies</Label>
            {selected.data.competencies.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: '4px 0 10px' }}>No competencies yet — add what you're evaluating.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0 12px' }} data-testid="competencies-list">
                {selected.data.competencies.map((c, i) => (
                  <div key={i} className="module-list-row" data-testid="competency-item" style={{ alignItems: 'center' }}>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{c.name}</span>
                    </div>
                    <Tag>Weight ×{c.weight}</Tag>
                    <IconButton label="Remove" onClick={() => removeCompetency(i)}>
                      ✕
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Competency</Label>
                <Input value={compName} onChange={(e) => setCompName(e.target.value)} placeholder="e.g. Objection Handling" data-testid="competency-input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 90 }}>
                <Label>Weight</Label>
                <Input type="number" value={compWeight} onChange={(e) => setCompWeight(e.target.value)} data-testid="weight-input" style={{ width: '100%' }} />
              </div>
              <Button variant="secondary" onClick={addCompetency} data-testid="add-competency-button">
                + Add
              </Button>
            </div>
          </>
        )}
      </Section>

      {selected && selected.data.competencies.length > 0 && (
        <>
          <Divider />
          <Section title="Score a Candidate">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
              {selected.data.competencies.map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} data-testid={`score-row-${i}`}>
                  <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, minWidth: 140 }}>{c.name}</span>
                  <span style={{ display: 'inline-flex', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Button
                        key={v}
                        variant={draftScores[i] === v ? 'primary' : 'ghost'}
                        onClick={() => setDraftScore(i, v)}
                        data-testid={`score-${i}-${v}`}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                      >
                        {v}
                      </Button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <Label>Candidate</Label>
                <Input value={candidate} onChange={(e) => setCandidate(e.target.value)} placeholder="e.g. Alex T." data-testid="candidate-input" style={{ width: '100%' }} />
              </div>
              <Button variant="primary" onClick={submitEvaluation} data-testid="submit-evaluation-button">
                ✓ Submit Scores
              </Button>
            </div>
          </Section>
        </>
      )}

      {selected && (
        <>
          <Divider />
          <Section title="Leaderboard">
            {ranked.length === 0 ? (
              <EmptyState icon="🧪">No evaluations yet for this assessment.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="leaderboard">
                {ranked.map((e, i) => {
                  const score = weightedScore(selected.data, e.data.scores);
                  return (
                    <div key={e.docId} className="module-list-row" data-testid="evaluation-item" style={{ alignItems: 'center' }}>
                      <span style={{ color: 'var(--module-accent)', fontWeight: 700, minWidth: 28 }}>#{i + 1}</span>
                      <div className="module-list-row-content" style={{ flex: 1 }}>
                        <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.candidate}</span>
                        <span style={{ fontSize: 12, marginLeft: 8 }}>{e.data.scores.join(' · ')}</span>
                      </div>
                      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--module-accent)' }} data-testid={`total-${e.data.candidate}`}>
                        {score.toFixed(2)} / 5
                      </span>
                      <IconButton label="Remove" onClick={() => removeEvaluation(e.docId)}>
                        ✕
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            )}

            {competencyAverages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="competency-averages">
                <Label>Average by Competency</Label>
                {competencyAverages.map((c) => (
                  <div key={c.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--color-text)' }}>{c.name}</span>
                      <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }}>{c.avg.toFixed(1)} / 5</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.avg / 5) * 100}%`, background: 'var(--module-accent)', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportResults}>
              Export Results as CSV
            </GatedAction>
          </Section>
        </>
      )}
    </div>
  );
}
