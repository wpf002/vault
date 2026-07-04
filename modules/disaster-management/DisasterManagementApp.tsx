import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Disaster Management App — the incident coordinator's board: hazard
// alerts by severity, a check-in queue of stranded people, and rescue
// teams you dispatch against that queue (assign → team deployed, rescue
// complete → team freed). Scope note: broadcast warnings and live GPS
// location are notification/geo integrations — the triage queue and
// dispatch state machine are the substance. Companion to the
// emergency-resource-map module (shelter/site capacity lives there).

type Alert = { hazard: string; severity: 'watch' | 'warning' | 'emergency'; area: string; active: boolean };
type CheckIn = { name: string; location: string; people: number; needs: string; status: 'waiting' | 'assigned' | 'rescued' };
type Team = { name: string; members: number; status: 'available' | 'deployed'; assignedTo: string };

const SEVERITY_META: Record<Alert['severity'], { label: string; color: string }> = {
  watch: { label: '👁️ Watch', color: '#f5c451' },
  warning: { label: '⚠️ Warning', color: '#ff9f0a' },
  emergency: { label: '🚨 Emergency', color: '#ff6b5e' },
};

export function DisasterManagementApp({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [alerts, setAlerts] = useState<StoreDoc<Alert>[] | null>(null);
  const [checkIns, setCheckIns] = useState<StoreDoc<CheckIn>[] | null>(null);
  const [teams, setTeams] = useState<StoreDoc<Team>[] | null>(null);
  const [hazard, setHazard] = useState('');
  const [severity, setSeverity] = useState<Alert['severity']>('watch');
  const [area, setArea] = useState('');
  const [ciName, setCiName] = useState('');
  const [ciLocation, setCiLocation] = useState('');
  const [ciPeople, setCiPeople] = useState('1');
  const [ciNeeds, setCiNeeds] = useState('');
  const [dispatching, setDispatching] = useState<string | null>(null);

  useEffect(() => {
    store.list<Alert>('alerts').then(setAlerts);
    store.list<CheckIn>('checkIns').then(setCheckIns);
    store.list<Team>('teams').then(setTeams);
  }, [store]);

  const activeAlerts = (alerts ?? []).filter((a) => a.data.active);
  const waiting = (checkIns ?? []).filter((c) => c.data.status === 'waiting');
  const peopleWaiting = waiting.reduce((s, c) => s + c.data.people, 0);
  const availableTeams = (teams ?? []).filter((t) => t.data.status === 'available');

  async function addAlert() {
    if (!hazard.trim()) return;
    const doc = await store.create('alerts', { hazard: hazard.trim(), severity, area: area.trim() || 'Countywide', active: true });
    setAlerts((prev) => [doc, ...(prev ?? [])]);
    setHazard('');
    setArea('');
  }

  async function toggleAlert(doc: StoreDoc<Alert>) {
    const updated = await store.update('alerts', doc.docId, { ...doc.data, active: !doc.data.active });
    setAlerts((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
  }

  async function removeAlert(docId: string) {
    await store.remove('alerts', docId);
    setAlerts((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  async function addCheckIn() {
    if (!ciName.trim() || !ciLocation.trim()) return;
    const c: CheckIn = { name: ciName.trim(), location: ciLocation.trim(), people: Math.max(1, Math.round(Number(ciPeople) || 1)), needs: ciNeeds.trim() || 'Unknown', status: 'waiting' };
    const doc = await store.create('checkIns', c);
    setCheckIns((prev) => [...(prev ?? []), doc]);
    setCiName('');
    setCiLocation('');
    setCiPeople('1');
    setCiNeeds('');
  }

  async function dispatch(checkIn: StoreDoc<CheckIn>, team: StoreDoc<Team>) {
    const nextCi: CheckIn = { ...checkIn.data, status: 'assigned' };
    const nextTeam: Team = { ...team.data, status: 'deployed', assignedTo: checkIn.data.name };
    const uCi = await store.update('checkIns', checkIn.docId, nextCi);
    const uTeam = await store.update('teams', team.docId, nextTeam);
    setCheckIns((prev) => (prev ?? []).map((c) => (c.docId === uCi.docId ? uCi : c)));
    setTeams((prev) => (prev ?? []).map((t) => (t.docId === uTeam.docId ? uTeam : t)));
    setDispatching(null);
  }

  async function markRescued(checkIn: StoreDoc<CheckIn>) {
    const nextCi: CheckIn = { ...checkIn.data, status: 'rescued' };
    const uCi = await store.update('checkIns', checkIn.docId, nextCi);
    setCheckIns((prev) => (prev ?? []).map((c) => (c.docId === uCi.docId ? uCi : c)));
    // free whichever team was on this check-in
    const team = (teams ?? []).find((t) => t.data.assignedTo === checkIn.data.name);
    if (team) {
      const nextTeam: Team = { ...team.data, status: 'available', assignedTo: '' };
      const uTeam = await store.update('teams', team.docId, nextTeam);
      setTeams((prev) => (prev ?? []).map((t) => (t.docId === uTeam.docId ? uTeam : t)));
    }
  }

  async function removeCheckIn(docId: string) {
    await store.remove('checkIns', docId);
    setCheckIns((prev) => (prev ?? []).filter((c) => c.docId !== docId));
  }

  function exportLog() {
    const rows = (checkIns ?? []).map((c) => `"${c.data.name}","${c.data.location}",${c.data.people},"${c.data.needs}",${c.data.status}`);
    const csv = ['party,location,people,needs,status', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'incident-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (alerts === null || checkIns === null || teams === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="disaster-management-root">
      <Section title="Incident Command">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="active-alerts">{activeAlerts.length}</span>} label="Active alerts" />
          <StatDisplay value={<span data-testid="people-waiting">{peopleWaiting}</span>} label="People awaiting rescue" />
          <StatDisplay value={<span data-testid="teams-available">{availableTeams.length}</span>} label="Teams available" />
        </div>
      </Section>

      <Divider />

      <Section title="Hazard Alerts">
        {alerts.length === 0 ? (
          <EmptyState icon="🌪️">No alerts issued.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="alerts-list">
            {alerts.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="alert-item" style={{ alignItems: 'center', opacity: a.data.active ? 1 : 0.55 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: SEVERITY_META[a.data.severity].color, minWidth: 100 }}>{SEVERITY_META[a.data.severity].label}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{a.data.hazard}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>{a.data.area}</span>
                </div>
                <Tag active={a.data.active} onClick={() => toggleAlert(a)}>
                  {a.data.active ? '🔴 Active' : 'Stood Down'}
                </Tag>
                <IconButton label="Remove" onClick={() => removeAlert(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Hazard</Label>
            <Input value={hazard} onChange={(e) => setHazard(e.target.value)} placeholder="e.g. River Flooding" data-testid="hazard-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 140 }}>
            <Label>Severity</Label>
            <Select value={severity} onChange={(e) => setSeverity(e.target.value as Alert['severity'])} data-testid="severity-select" style={{ width: '100%' }}>
              <option value="watch">Watch</option>
              <option value="warning">Warning</option>
              <option value="emergency">Emergency</option>
            </Select>
          </div>
          <div style={{ width: 170 }}>
            <Label>Area</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. South of Route 9" data-testid="area-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addAlert} data-testid="issue-alert-button">
            Issue Alert
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Check-In Queue">
        {checkIns.length === 0 ? (
          <EmptyState icon="🙋">No one has checked in.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="checkins-list">
            {checkIns.map((c) => (
              <div key={c.docId} className="module-list-row" data-testid="checkin-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div className="module-list-row-content" style={{ flex: 1 }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                      {c.data.name} · {c.data.people} {c.data.people === 1 ? 'person' : 'people'}
                    </span>
                    <div style={{ fontSize: 12, marginTop: 2, color: 'var(--color-text-dim)' }}>
                      📍 {c.data.location} · {c.data.needs}
                    </div>
                  </div>
                  <Tag active={c.data.status === 'rescued'} data-testid={`ci-status-${c.docId}`}>
                    {c.data.status === 'waiting' ? '⏳ Waiting' : c.data.status === 'assigned' ? '🚁 Team En Route' : '✅ Rescued'}
                  </Tag>
                  {c.data.status === 'waiting' && (
                    <Button variant="secondary" onClick={() => setDispatching(dispatching === c.docId ? null : c.docId)} data-testid={`dispatch-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Dispatch
                    </Button>
                  )}
                  {c.data.status === 'assigned' && (
                    <Button variant="secondary" onClick={() => markRescued(c)} data-testid={`rescued-${c.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                      Rescued
                    </Button>
                  )}
                  <IconButton label="Remove" onClick={() => removeCheckIn(c.docId)}>
                    ✕
                  </IconButton>
                </div>
                {dispatching === c.docId && (
                  <div style={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', gap: 6 }} data-testid="dispatch-picker">
                    <Label>Send Which Team?</Label>
                    {availableTeams.length === 0 ? (
                      <span style={{ fontSize: 12, color: '#ff9f0a' }}>No teams available — free one up first.</span>
                    ) : (
                      availableTeams.map((t) => (
                        <Button key={t.docId} variant="ghost" onClick={() => dispatch(c, t)} data-testid={`send-${t.docId}`} style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                          🚁 {t.data.name} ({t.data.members} members)
                        </Button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ width: 140 }}>
            <Label>Party</Label>
            <Input value={ciName} onChange={(e) => setCiName(e.target.value)} placeholder="e.g. Chen household" data-testid="ci-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Location</Label>
            <Input value={ciLocation} onChange={(e) => setCiLocation(e.target.value)} placeholder="Where they are" data-testid="ci-location-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 80 }}>
            <Label>People</Label>
            <Input type="number" value={ciPeople} onChange={(e) => setCiPeople(e.target.value)} data-testid="ci-people-input" style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Needs</Label>
            <Input value={ciNeeds} onChange={(e) => setCiNeeds(e.target.value)} placeholder="e.g. medical, boat" data-testid="ci-needs-input" style={{ width: '100%' }} />
          </div>
          <Button variant="primary" onClick={addCheckIn} data-testid="add-checkin-button">
            Log Check-In
          </Button>
        </div>
      </Section>

      <Divider />

      <Section title="Rescue Teams">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="teams-list">
          {teams.map((t) => (
            <div key={t.docId} className="module-list-row" data-testid="team-item" style={{ alignItems: 'center' }}>
              <div className="module-list-row-content" style={{ flex: 1 }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{t.data.name}</span>
                <span style={{ fontSize: 12, marginLeft: 8 }}>{t.data.members} members</span>
              </div>
              <Tag active={t.data.status === 'available'} data-testid={`team-status-${t.docId}`}>
                {t.data.status === 'available' ? '🟢 Available' : `🚁 Deployed → ${t.data.assignedTo}`}
              </Tag>
            </div>
          ))}
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportLog}>
          Export Incident Log as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
