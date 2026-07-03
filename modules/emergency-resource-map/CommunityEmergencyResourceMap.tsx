import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Community Emergency Resource Map — an SVG sector map (10×10 grid) of
// shelters and services with live status (open/full/closed), shelter
// occupancy tracking, and a printable roster export. Scope note: real
// geo tiles and "real-time" feeds are GIS/third-party integrations —
// sector coordinates stand in for pins, and status is updated by the
// coordinator (you), which is how small-town EOCs actually run.

type ResourceType = 'shelter' | 'water' | 'medical' | 'food' | 'charging';
type Resource = { name: string; type: ResourceType; gridX: number; gridY: number; status: 'open' | 'full' | 'closed'; capacity: number; occupancy: number };

const TYPE_META: Record<ResourceType, { icon: string; label: string }> = {
  shelter: { icon: '🏠', label: 'Shelter' },
  water: { icon: '💧', label: 'Water' },
  medical: { icon: '⚕️', label: 'Medical' },
  food: { icon: '🥫', label: 'Food' },
  charging: { icon: '🔌', label: 'Charging' },
};

const STATUS_COLORS: Record<Resource['status'], string> = { open: '#39d98a', full: '#ff9f0a', closed: '#ff6b5e' };

export function CommunityEmergencyResourceMap({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [resources, setResources] = useState<StoreDoc<Resource>[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('shelter');
  const [gridX, setGridX] = useState('5');
  const [gridY, setGridY] = useState('5');
  const [capacity, setCapacity] = useState('');

  useEffect(() => {
    store.list<Resource>('resources').then(setResources);
  }, [store]);

  const list = resources ?? [];
  const selected = list.find((r) => r.docId === selectedId) ?? null;
  const openShelters = list.filter((r) => r.data.type === 'shelter' && r.data.status === 'open');
  const bedsFree = openShelters.reduce((s, r) => s + Math.max(0, r.data.capacity - r.data.occupancy), 0);
  const closedCount = list.filter((r) => r.data.status !== 'open').length;

  async function update(doc: StoreDoc<Resource>, patch: Partial<Resource>) {
    const next: Resource = { ...doc.data, ...patch };
    const updated = await store.update('resources', doc.docId, next);
    setResources((prev) => (prev ?? []).map((r) => (r.docId === doc.docId ? updated : r)));
  }

  async function addResource() {
    if (!name.trim()) return;
    const r: Resource = {
      name: name.trim(),
      type,
      gridX: Math.min(9, Math.max(0, Math.round(Number(gridX) || 0))),
      gridY: Math.min(9, Math.max(0, Math.round(Number(gridY) || 0))),
      status: 'open',
      capacity: type === 'shelter' || type === 'medical' ? Math.max(0, Math.round(Number(capacity) || 0)) : 0,
      occupancy: 0,
    };
    const doc = await store.create('resources', r);
    setResources((prev) => [...(prev ?? []), doc]);
    setName('');
    setCapacity('');
  }

  async function removeResource(docId: string) {
    await store.remove('resources', docId);
    setResources((prev) => (prev ?? []).filter((r) => r.docId !== docId));
    if (selectedId === docId) setSelectedId(null);
  }

  function exportRoster() {
    const rows = list.map((r) => `"${r.data.name}",${TYPE_META[r.data.type].label},${r.data.status},"sector ${r.data.gridX}-${r.data.gridY}",${r.data.capacity || ''},${r.data.occupancy || ''}`);
    const csv = ['name,type,status,sector,capacity,occupancy', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resource-roster.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (resources === null) return <LoadingState />;

  return (
    <div className="module-card" data-testid="emergency-resource-map-root">
      <Section title="Situation Board">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          <StatDisplay value={<span data-testid="open-shelters">{openShelters.length}</span>} label="Shelters accepting" />
          <StatDisplay value={<span data-testid="beds-free">{bedsFree}</span>} label="Beds available" />
          <StatDisplay value={closedCount} label="Sites full or closed" />
        </div>
      </Section>

      <Divider />

      <Section title="Sector Map">
        {list.length === 0 ? (
          <EmptyState icon="🆘">No resources plotted — add the first below.</EmptyState>
        ) : (
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <svg viewBox="0 0 300 300" style={{ width: 300, maxWidth: '100%', borderRadius: 10, background: 'var(--color-surface-2, rgba(255,255,255,0.04))' }} data-testid="sector-map">
              {Array.from({ length: 11 }, (_, i) => (
                <g key={i}>
                  <line x1={i * 30} y1={0} x2={i * 30} y2={300} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                  <line x1={0} y1={i * 30} x2={300} y2={i * 30} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
                </g>
              ))}
              {list.map((r) => (
                <g key={r.docId} transform={`translate(${r.data.gridX * 30 + 15}, ${r.data.gridY * 30 + 15})`} style={{ cursor: 'pointer' }} onClick={() => setSelectedId(r.docId)} data-testid={`pin-${r.docId}`}>
                  <circle r={12} fill={STATUS_COLORS[r.data.status]} opacity={selectedId === r.docId ? 1 : 0.35} />
                  <text textAnchor="middle" dominantBaseline="central" fontSize={12}>
                    {TYPE_META[r.data.type].icon}
                  </text>
                </g>
              ))}
            </svg>

            <div style={{ flex: 1, minWidth: 240 }}>
              {selected ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="detail-panel">
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
                      {TYPE_META[selected.data.type].icon} {selected.data.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 2 }}>
                      {TYPE_META[selected.data.type].label} · sector {selected.data.gridX}-{selected.data.gridY}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['open', 'full', 'closed'] as const).map((s) => (
                      <Tag key={s} active={selected.data.status === s} onClick={() => update(selected, { status: s })}>
                        {s === 'open' ? '🟢 Open' : s === 'full' ? '🟠 Full' : '🔴 Closed'}
                      </Tag>
                    ))}
                  </div>
                  {selected.data.capacity > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--color-text)' }}>Occupancy</span>
                        <span style={{ color: 'var(--color-text-dim)', fontVariantNumeric: 'tabular-nums' }} data-testid="occupancy-readout">
                          {selected.data.occupancy} / {selected.data.capacity}
                        </span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: 'var(--color-surface-2, rgba(255,255,255,0.08))', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, (selected.data.occupancy / selected.data.capacity) * 100)}%`,
                            background: selected.data.occupancy >= selected.data.capacity ? '#ff9f0a' : 'var(--module-accent)',
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="secondary" onClick={() => update(selected, { occupancy: Math.min(selected.data.capacity, selected.data.occupancy + 10) })} data-testid="occupancy-up" style={{ padding: '4px 10px', fontSize: 12 }}>
                          +10 Arrivals
                        </Button>
                        <Button variant="ghost" onClick={() => update(selected, { occupancy: Math.max(0, selected.data.occupancy - 10) })} data-testid="occupancy-down" style={{ padding: '4px 10px', fontSize: 12 }}>
                          −10 Departures
                        </Button>
                      </div>
                    </div>
                  )}
                  <Button variant="ghost" onClick={() => removeResource(selected.docId)} style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: 12 }}>
                    🗑️ Remove Site
                  </Button>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>Select a pin to update its status or occupancy.</p>
              )}
            </div>
          </div>
        )}
      </Section>

      <Divider />

      <Section title="All Sites">
        {list.length === 0 ? (
          <EmptyState icon="📋">Nothing on the roster.</EmptyState>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }} data-testid="sites-list">
            {list.map((r) => (
              <div key={r.docId} className="module-list-row" data-testid="site-item" style={{ alignItems: 'center' }}>
                <span style={{ minWidth: 24 }}>{TYPE_META[r.data.type].icon}</span>
                <div className="module-list-row-content" style={{ flex: 1 }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.data.name}</span>
                  <span style={{ fontSize: 12, marginLeft: 8 }}>sector {r.data.gridX}-{r.data.gridY}</span>
                </div>
                <span style={{ fontSize: 12, color: STATUS_COLORS[r.data.status], fontWeight: 700 }} data-testid={`status-${r.docId}`}>
                  {r.data.status.toUpperCase()}
                </span>
                <IconButton label="Remove" onClick={() => removeResource(r.docId)}>
                  ✕
                </IconButton>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <Label>Site</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Armory Shelter" data-testid="site-name-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 130 }}>
            <Label>Type</Label>
            <Select value={type} onChange={(e) => setType(e.target.value as ResourceType)} data-testid="type-select" style={{ width: '100%' }}>
              {Object.entries(TYPE_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ width: 80 }}>
            <Label>Sector X</Label>
            <Input type="number" value={gridX} onChange={(e) => setGridX(e.target.value)} data-testid="grid-x-input" style={{ width: '100%' }} />
          </div>
          <div style={{ width: 80 }}>
            <Label>Sector Y</Label>
            <Input type="number" value={gridY} onChange={(e) => setGridY(e.target.value)} data-testid="grid-y-input" style={{ width: '100%' }} />
          </div>
          {(type === 'shelter' || type === 'medical') && (
            <div style={{ width: 100 }}>
              <Label>Capacity</Label>
              <Input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} data-testid="capacity-input" style={{ width: '100%' }} />
            </div>
          )}
          <Button variant="primary" onClick={addResource} data-testid="add-site-button">
            📍 Plot Site
          </Button>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportRoster}>
          ⬇️ Export Roster as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
