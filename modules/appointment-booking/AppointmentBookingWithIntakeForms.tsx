import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Textarea, Label, Section, Divider, SegmentedControl, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Appointment Booking with Intake Forms — Scheduling calendar with
// conditional intake forms. The conditional part: Initial Consultations
// require an intake note before they can be confirmed; follow-ups don't.
// Scope note: this is the provider-side book — a public self-serve booking
// page needs platform-level public share links.

const STATUSES = ['pending', 'confirmed', 'completed'] as const;
type Status = (typeof STATUSES)[number];

type Appointment = { client: string; service: string; date: string; time: string; intake: string; status: Status };

const NEEDS_INTAKE = 'Initial Consultation';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function AppointmentBookingWithIntakeForms({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [appointments, setAppointments] = useState<StoreDoc<Appointment>[] | null>(null);
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [client, setClient] = useState('');
  const [service, setService] = useState(NEEDS_INTAKE);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [intake, setIntake] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    store.list<Appointment>('appointments').then((docs) => setAppointments(docs.sort((a, b) => `${a.data.date}T${a.data.time}`.localeCompare(`${b.data.date}T${b.data.time}`))));
  }, [store]);

  const visible = (appointments ?? []).filter((a) => (view === 'upcoming' ? a.data.date >= todayStr() : a.data.date < todayStr()));

  async function book() {
    setError(null);
    if (!client.trim() || !date) {
      setError('Client and date are required.');
      return;
    }
    if (service === NEEDS_INTAKE && !intake.trim()) {
      setError(`${NEEDS_INTAKE} requires the intake form below.`);
      return;
    }
    const appt: Appointment = { client: client.trim(), service, date, time, intake: intake.trim(), status: 'pending' };
    const doc = await store.create('appointments', appt);
    setAppointments((prev) => [...(prev ?? []), doc].sort((a, b) => `${a.data.date}T${a.data.time}`.localeCompare(`${b.data.date}T${b.data.time}`)));
    setClient('');
    setIntake('');
  }

  async function advance(doc: StoreDoc<Appointment>) {
    const idx = STATUSES.indexOf(doc.data.status);
    const next = STATUSES[idx + 1];
    if (!next) return;
    const updated = await store.update('appointments', doc.docId, { ...doc.data, status: next });
    setAppointments((prev) => (prev ?? []).map((a) => (a.docId === doc.docId ? updated : a)));
  }

  async function remove(docId: string) {
    await store.remove('appointments', docId);
    setAppointments((prev) => (prev ?? []).filter((a) => a.docId !== docId));
  }

  function exportSchedule() {
    const rows = (appointments ?? []).map((a) => `${a.data.date},${a.data.time},"${a.data.client}","${a.data.service}",${a.data.status},"${a.data.intake}"`);
    const csv = ['date,time,client,service,status,intake', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appointments.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (appointments === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="appointment-booking-root">
      <Section title="Book an Appointment">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Label>Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client name" data-testid="client-input" style={{ width: '100%' }} />
          </div>
          <div>
            <Label>Service</Label>
            <SegmentedControl
              options={[
                { value: NEEDS_INTAKE, label: NEEDS_INTAKE },
                { value: 'Follow-Up Session', label: 'Follow-Up' },
              ]}
              value={service}
              onChange={setService}
            />
          </div>
          <div style={{ width: 150 }}>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="date-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 110 }}>
            <Label>Time</Label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} data-testid="time-input" style={{ width: '100%' }} />
          </div>
        </div>

        {service === NEEDS_INTAKE && (
          <div style={{ marginBottom: 12 }}>
            <Label>Intake Form (Required for {NEEDS_INTAKE})</Label>
            <Textarea value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="Background, goals, referral source…" data-testid="intake-input" />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Button variant="primary" onClick={book} data-testid="book-button">
            Book
          </Button>
          {error && (
            <span style={{ fontSize: 13, color: '#ff6b5e' }} data-testid="book-error">
              {error}
            </span>
          )}
        </div>
      </Section>

      <Divider />

      <Section title="Schedule">
        <div style={{ marginBottom: 12 }}>
          <SegmentedControl
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
            value={view}
            onChange={setView}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState icon="📆">No {view} appointments.</EmptyState>
        ) : (
          <div data-testid="appointments-list" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {visible.map((a) => (
              <div key={a.docId} className="module-list-row" data-testid="appointment-item" style={{ alignItems: 'center' }}>
                <div style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--module-accent)', fontWeight: 700, fontSize: 13, minWidth: 100 }}>
                  {a.data.date}
                  <br />
                  {a.data.time}
                </div>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{a.data.client}</span>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    {a.data.service}
                    {a.data.intake && <span> · 📋 intake on file</span>}
                  </div>
                </div>
                <Tag active={a.data.status !== 'pending'}>{a.data.status}</Tag>
                {a.data.status !== 'completed' && (
                  <Button variant="secondary" onClick={() => advance(a)} data-testid={`advance-${a.docId}`} style={{ padding: '5px 10px', fontSize: 12 }}>
                    {a.data.status === 'pending' ? 'Confirm' : 'Complete'}
                  </Button>
                )}
                <IconButton label="Remove" onClick={() => remove(a.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportSchedule}>
          Export Appointments as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
