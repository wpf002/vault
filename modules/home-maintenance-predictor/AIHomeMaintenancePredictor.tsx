import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { AiResult, StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// AI Home Maintenance Predictor — keep an appliance inventory (age +
// symptoms), run an assessment through the proxy, and get back a strict
// RISK | LIKELY ISSUE | ACTION | WHEN line per appliance that lands on a
// maintenance schedule. The model reasons from age and symptoms the way
// a home inspector ballparks it — the UI says so (estimate, not a
// diagnosis). CONTRACT.md #11 failure states rendered.

type Appliance = { name: string; brand: string; ageYears: number; symptoms: string };
type Task = { appliance: string; risk: 'low' | 'medium' | 'high'; issue: string; action: string; when: string };

const SYSTEM_PROMPT = [
  'You are a home-maintenance advisor. For each numbered appliance output exactly one line:',
  'N | LOW or MEDIUM or HIGH | LIKELY ISSUE (short phrase) | RECOMMENDED ACTION (imperative) | WHEN (e.g. "Within 2 weeks", "This year")',
  'Base risk on typical service life, age, and reported symptoms. Be practical, not alarmist.',
  'No headers, no commentary, nothing else.',
].join(' ');

const RISK_META: Record<Task['risk'], { label: string; color: string }> = {
  high: { label: '🔴 High', color: '#ff6b5e' },
  medium: { label: '🟡 Medium', color: '#f5c451' },
  low: { label: '🟢 Low', color: '#39d98a' },
};

function parseAssessment(text: string, appliances: Appliance[]): Task[] {
  const tasks: Task[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.includes('|')) continue;
    const parts = line.split('|').map((p) => p.trim());
    const idx = Number(parts[0]) - 1;
    const risk = parts[1]?.toLowerCase();
    if (idx >= 0 && idx < appliances.length && (risk === 'low' || risk === 'medium' || risk === 'high')) {
      tasks.push({ appliance: appliances[idx]!.name, risk, issue: parts[2] || 'General wear', action: parts[3] || 'Inspect', when: parts[4] || 'This year' });
    }
  }
  return tasks;
}

export function AIHomeMaintenancePredictor({ mode, store, ai, requestUpgrade }: ModuleComponentProps) {
  const [appliances, setAppliances] = useState<StoreDoc<Appliance>[] | null>(null);
  const [schedule, setSchedule] = useState<StoreDoc<Task>[] | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [age, setAge] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState<Exclude<AiResult, { ok: true }>['reason'] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    store.list<Appliance>('appliances').then(setAppliances);
    store.list<Task>('schedule').then(setSchedule);
  }, [store]);

  const applianceList = appliances ?? [];
  const scheduleList = schedule ?? [];
  const highRisk = scheduleList.filter((t) => t.data.risk === 'high').length;

  async function assess() {
    if (!ai || working || applianceList.length === 0) return;
    setWorking(true);
    setFailure(null);
    const numbered = applianceList.map((a, i) => `${i + 1}. ${a.data.name} (${a.data.brand}), ${a.data.ageYears} years old${a.data.symptoms ? `, symptoms: ${a.data.symptoms}` : ', no symptoms'}`);
    const res = await ai.complete({ system: SYSTEM_PROMPT, prompt: `Appliances:\n${numbered.join('\n')}` });
    setWorking(false);
    if (!res.ok) {
      setFailure(res.reason);
      return;
    }
    setRemaining(res.remainingPreviewCalls ?? null);
    const tasks = parseAssessment(res.text, applianceList.map((a) => a.data));
    // fresh assessment replaces the old schedule — stale predictions are noise
    for (const old of scheduleList) await store.remove('schedule', old.docId);
    const created: StoreDoc<Task>[] = [];
    for (const t of tasks) created.push(await store.create('schedule', t));
    setSchedule(created);
  }

  async function addAppliance() {
    if (!name.trim()) return;
    const a: Appliance = { name: name.trim(), brand: brand.trim() || '—', ageYears: Math.max(0, Math.round(Number(age) || 0)), symptoms: symptoms.trim() };
    const doc = await store.create('appliances', a);
    setAppliances((prev) => [...(prev ?? []), doc]);
    setName('');
    setBrand('');
    setAge('');
    setSymptoms('');
  }

  async function removeAppliance(docId: string) {
    await store.remove('appliances', docId);
    setAppliances((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  async function completeTask(docId: string) {
    await store.remove('schedule', docId);
    setSchedule((prev) => (prev ?? []).filter((t) => t.docId !== docId));
  }

  function exportSchedule() {
    const order: Task['risk'][] = ['high', 'medium', 'low'];
    const sorted = [...scheduleList].sort((a, b) => order.indexOf(a.data.risk) - order.indexOf(b.data.risk));
    const lines = sorted.map((t) => `- [ ] **${t.data.appliance}** (${t.data.risk} risk) — ${t.data.action} · ${t.data.when}\n  - Likely issue: ${t.data.issue}`);
    const md = ['# Home Maintenance Schedule', '', '_AI estimate from age and symptoms — not a professional inspection._', '', ...lines].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maintenance-schedule.md';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (appliances === null || schedule === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="home-maintenance-predictor-root">
      <Section title="Run an Assessment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={assess} data-testid="assess-button" disabled={working || applianceList.length === 0}>
              {working ? '🏠 Assessing…' : '🏠 Predict What Needs Attention'}
            </Button>
            <span style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>Estimate from age + symptoms — not a professional inspection.</span>
          </div>

          {remaining !== null && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0 }} data-testid="remaining-calls">
              🎟️ {remaining} free AI {remaining === 1 ? 'assessment' : 'assessments'} left in preview — unlock the app for unlimited runs.
            </p>
          )}
          {failure === 'sign_in_required' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-sign-in">
              🔑 Assessments need an account, even to try — sign in for a few free runs.
            </div>
          )}
          {failure === 'preview_exhausted' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }} data-testid="failure-exhausted">
              <span>🎟️ Your free assessments are used up — unlock the app to keep predicting.</span>
              <Button variant="primary" onClick={requestUpgrade} data-testid="upgrade-button" style={{ padding: '5px 12px', fontSize: 12 }}>
                Unlock
              </Button>
            </div>
          )}
          {failure === 'unavailable' && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.05))', fontSize: 13 }} data-testid="failure-unavailable">
              🔌 The predictor is offline right now — try again in a bit.
            </div>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Maintenance Schedule">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <StatDisplay value={<span data-testid="task-count">{scheduleList.length}</span>} label="Open tasks" />
          <StatDisplay value={<span data-testid="high-risk-count" style={{ color: highRisk > 0 ? '#ff6b5e' : undefined }}>{highRisk}</span>} label="High risk" />
          <StatDisplay value={applianceList.length} label="Appliances tracked" />
        </div>

        {scheduleList.length === 0 ? (
          <EmptyState icon="🗓️">No schedule yet — run an assessment.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }} data-testid="schedule-list">
            {(['high', 'medium', 'low'] as const).flatMap((risk) =>
              scheduleList
                .filter((t) => t.data.risk === risk)
                .map((t) => (
                  <div key={t.docId} className="module-list-row" data-testid="task-item" style={{ alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: RISK_META[t.data.risk].color, minWidth: 78 }}>{RISK_META[t.data.risk].label}</span>
                    <div className="module-list-row-content" style={{ flex: 1 }}>
                      <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                        {t.data.appliance}: {t.data.action}
                      </span>
                      <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                        {t.data.issue} · {t.data.when}
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => completeTask(t.docId)} data-testid={`done-${t.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      ✓ Done
                    </Button>
                  </div>
                )),
            )}
          </div>
        )}
      </Section>

      <Divider />

      <Section title="Appliance Inventory">
        {applianceList.length === 0 ? (
          <EmptyState icon="🏠">Add your appliances — age and symptoms drive the predictions.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="appliances-list">
            {applianceList.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="appliance-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{a.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                    {a.data.brand} · {a.data.ageYears} {a.data.ageYears === 1 ? 'year' : 'years'} old
                    {a.data.symptoms ? ` · ⚠️ ${a.data.symptoms}` : ''}
                  </div>
                </div>
                <IconButton label="Remove" onClick={() => removeAppliance(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 150 }}>
            <Label>Appliance</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dishwasher" data-testid="name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 150 }}>
            <Label>Brand / Model</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Bosch 300" data-testid="brand-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Age (Years)</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} data-testid="age-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Label>Symptoms (Optional)</Label>
            <Input value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="e.g. Leaves film on glasses" data-testid="symptoms-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addAppliance} data-testid="add-appliance-button">
            + Add
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSchedule}>
          ⬇️ Export Schedule as Markdown
        </GatedAction>
      </Section>
    </div>
  );
}
