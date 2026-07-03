import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Employee Skill Matching & Project Allocation — the matcher ranks
// every unassigned employee against a project by skill overlap, greyed
// out when they lack the free hours; assigning deducts the project's
// weekly hours from their availability (unassigning refunds it). The
// ranking is transparent — it shows which skills matched, not just a
// score.

type Employee = { name: string; skills: string[]; hoursFree: number };
type Project = { name: string; requiredSkills: string[]; hoursPerWeek: number; assigned: string[] };

function overlap(e: Employee, p: Project): string[] {
  return p.requiredSkills.filter((s) => e.skills.includes(s));
}

export function EmployeeSkillMatchingProjectAllocation({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [employees, setEmployees] = useState<StoreDoc<Employee>[] | null>(null);
  const [projects, setProjects] = useState<StoreDoc<Project>[] | null>(null);
  const [matchingFor, setMatchingFor] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eSkills, setESkills] = useState('');
  const [eHours, setEHours] = useState('');
  const [pName, setPName] = useState('');
  const [pSkills, setPSkills] = useState('');
  const [pHours, setPHours] = useState('');

  useEffect(() => {
    store.list<Employee>('employees').then(setEmployees);
    store.list<Project>('projects').then(setProjects);
  }, [store]);

  const empList = employees ?? [];
  const projList = projects ?? [];
  const unstaffed = projList.filter((p) => p.data.assigned.length === 0).length;
  const benchHours = empList.reduce((s, e) => s + e.data.hoursFree, 0);

  async function addEmployee() {
    if (!eName.trim()) return;
    const skills = eSkills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const doc = await store.create('employees', { name: eName.trim(), skills, hoursFree: Math.max(0, Math.round(Number(eHours) || 0)) });
    setEmployees((prev) => [...(prev ?? []), doc]);
    setEName('');
    setESkills('');
    setEHours('');
  }

  async function removeEmployee(docId: string) {
    await store.remove('employees', docId);
    setEmployees((prev) => (prev ?? []).filter((e) => e.docId !== docId));
  }

  async function addProject() {
    if (!pName.trim()) return;
    const requiredSkills = pSkills.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const doc = await store.create('projects', { name: pName.trim(), requiredSkills, hoursPerWeek: Math.max(1, Math.round(Number(pHours) || 5)), assigned: [] });
    setProjects((prev) => [...(prev ?? []), doc]);
    setPName('');
    setPSkills('');
    setPHours('');
  }

  async function removeProject(doc: StoreDoc<Project>) {
    // refund allocated hours before the project goes away
    for (const name of doc.data.assigned) {
      const emp = empList.find((e) => e.data.name === name);
      if (emp) {
        const updated = await store.update('employees', emp.docId, { ...emp.data, hoursFree: emp.data.hoursFree + doc.data.hoursPerWeek });
        setEmployees((prev) => (prev ?? []).map((e) => (e.docId === emp.docId ? updated : e)));
      }
    }
    await store.remove('projects', doc.docId);
    setProjects((prev) => (prev ?? []).filter((p) => p.docId !== doc.docId));
  }

  async function assign(project: StoreDoc<Project>, emp: StoreDoc<Employee>) {
    if (emp.data.hoursFree < project.data.hoursPerWeek) return;
    const updatedProj = await store.update('projects', project.docId, { ...project.data, assigned: [...project.data.assigned, emp.data.name] });
    const updatedEmp = await store.update('employees', emp.docId, { ...emp.data, hoursFree: emp.data.hoursFree - project.data.hoursPerWeek });
    setProjects((prev) => (prev ?? []).map((p) => (p.docId === project.docId ? updatedProj : p)));
    setEmployees((prev) => (prev ?? []).map((e) => (e.docId === emp.docId ? updatedEmp : e)));
  }

  async function unassign(project: StoreDoc<Project>, name: string) {
    const updatedProj = await store.update('projects', project.docId, { ...project.data, assigned: project.data.assigned.filter((n) => n !== name) });
    setProjects((prev) => (prev ?? []).map((p) => (p.docId === project.docId ? updatedProj : p)));
    const emp = empList.find((e) => e.data.name === name);
    if (emp) {
      const updatedEmp = await store.update('employees', emp.docId, { ...emp.data, hoursFree: emp.data.hoursFree + project.data.hoursPerWeek });
      setEmployees((prev) => (prev ?? []).map((e) => (e.docId === emp.docId ? updatedEmp : e)));
    }
  }

  function candidatesFor(project: StoreDoc<Project>): { emp: StoreDoc<Employee>; matched: string[] }[] {
    return empList
      .filter((e) => !project.data.assigned.includes(e.data.name))
      .map((emp) => ({ emp, matched: overlap(emp.data, project.data) }))
      .filter((c) => c.matched.length > 0)
      .sort((a, b) => b.matched.length - a.matched.length || b.emp.data.hoursFree - a.emp.data.hoursFree);
  }

  function exportAllocations() {
    const rows = projList.flatMap((p) => (p.data.assigned.length ? p.data.assigned.map((n) => `"${p.data.name}","${n}",${p.data.hoursPerWeek}`) : [`"${p.data.name}",UNSTAFFED,${p.data.hoursPerWeek}`]));
    const csv = ['project,employee,hours per week', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allocations.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (employees === null || projects === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="skill-matching-allocation-root">
      <Section title="Allocation Overview">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={empList.length} label="People on the roster" />
          <StatDisplay value={<span data-testid="unstaffed-count">{unstaffed}</span>} label="Projects unstaffed" />
          <StatDisplay value={<span data-testid="bench-hours">{benchHours}h</span>} label="Free hours across the team" />
        </div>
      </Section>

      <Divider />

      <Section title="Open Projects">
        {projList.length === 0 ? (
          <EmptyState icon="⚙️">No projects — open one below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }} data-testid="projects-list">
            {projList.map((p) => (
              <div key={p.docId} className="module-list-row" data-testid="project-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{p.data.name}</span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                      Needs: {p.data.requiredSkills.join(', ')} · {p.data.hoursPerWeek}h/week
                    </div>
                  </div>
                  {p.data.assigned.length === 0 ? <Tag active>Unstaffed</Tag> : <Tag>{p.data.assigned.length} assigned</Tag>}
                  <Button variant="secondary" onClick={() => setMatchingFor(matchingFor === p.docId ? null : p.docId)} data-testid={`match-${p.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    🎯 Find Matches
                  </Button>
                  <IconButton label="Remove" onClick={() => removeProject(p)}>
                    ✕
                  </IconButton>
                </div>

                {p.data.assigned.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 4 }}>
                    {p.data.assigned.map((n) => (
                      <Tag key={n} onClick={() => unassign(p, n)} data-testid={`assigned-${p.docId}-${n}`}>
                        {n} ✕
                      </Tag>
                    ))}
                  </div>
                )}

                {matchingFor === p.docId && (
                  <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="match-panel">
                    <Label>Ranked by Skill Overlap</Label>
                    {candidatesFor(p).length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--color-text-dim)' }}>No one on the roster has the required skills.</span>
                    ) : (
                      candidatesFor(p).map(({ emp, matched }) => {
                        const canTake = emp.data.hoursFree >= p.data.hoursPerWeek;
                        return (
                          <div key={emp.docId} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: canTake ? 1 : 0.5 }} data-testid={`candidate-${emp.docId}`}>
                            <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600, minWidth: 110 }}>{emp.data.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--module-accent)', flex: 1 }}>
                              {matched.length}/{p.data.requiredSkills.length} skills: {matched.join(', ')}
                            </span>
                            <span style={{ fontSize: 12, color: canTake ? 'var(--color-text-dim)' : '#ff9f0a', fontVariantNumeric: 'tabular-nums' }}>{emp.data.hoursFree}h free</span>
                            <Button variant="ghost" onClick={() => assign(p, emp)} data-testid={`assign-${p.docId}-${emp.docId}`} disabled={!canTake} style={{ padding: '3px 10px', fontSize: 12 }}>
                              {canTake ? '+ Assign' : 'No Hours'}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ width: 160 }}>
            <Label>Project</Label>
            <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Mobile App v2" data-testid="project-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Label>Required Skills (Comma-Separated)</Label>
            <Input value={pSkills} onChange={(e) => setPSkills(e.target.value)} placeholder="react, node" data-testid="project-skills-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 100 }}>
            <Label>Hours/Week</Label>
            <Input type="number" value={pHours} onChange={(e) => setPHours(e.target.value)} data-testid="project-hours-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addProject} data-testid="add-project-button">
            + Open Project
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Team Roster">
        {empList.length === 0 ? (
          <EmptyState icon="🧑‍💼">Nobody on the roster.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="employees-list">
            {empList.map((e) => (
              <div key={e.docId} className="module-list-row" data-testid="employee-item" style={{ alignItems: 'center' }}>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{e.data.name}</span>
                  <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>{e.data.skills.join(', ')}</div>
                </div>
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: e.data.hoursFree === 0 ? '#ff9f0a' : 'var(--module-accent)' }} data-testid={`hours-${e.docId}`}>
                  {e.data.hoursFree}h free
                </span>
                <IconButton label="Remove" onClick={() => removeEmployee(e.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 140 }}>
            <Label>Name</Label>
            <Input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="e.g. Noor Aziz" data-testid="employee-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Label>Skills (Comma-Separated)</Label>
            <Input value={eSkills} onChange={(e) => setESkills(e.target.value)} placeholder="python, sql" data-testid="employee-skills-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Hours Free</Label>
            <Input type="number" value={eHours} onChange={(e) => setEHours(e.target.value)} data-testid="employee-hours-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addEmployee} data-testid="add-employee-button">
            + Add Person
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportAllocations}>
          ⬇️ Export Allocations as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
