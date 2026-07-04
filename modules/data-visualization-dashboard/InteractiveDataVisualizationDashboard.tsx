import { useEffect, useMemo, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import type { StoreDoc } from '@vault/module-sdk';
import { Button, GatedAction, IconButton, Input, Select, Textarea, Label, Section, Divider, StatDisplay, Tag, EmptyState, LoadingState } from '@vault/module-ui';

// Interactive Data Visualization Dashboard — paste CSV, get an
// interactive SVG bar chart per numeric column (switch metric, hover a
// bar for exact values) plus summary stats. Charts are hand-drawn SVG —
// no chart library, per module bundle constraints. Datasets persist.

type Dataset = { name: string; csv: string };

type Parsed = { labels: string[]; columns: { name: string; values: number[] }[] };

function parseCsv(csv: string): Parsed | null {
  const lines = csv.trim().split('\n').map((l) => l.split(',').map((c) => c.trim()));
  if (lines.length < 2 || lines[0]!.length < 2) return null;
  const header = lines[0]!;
  const rows = lines.slice(1);
  const labels = rows.map((r) => r[0] ?? '');
  const columns = header.slice(1).map((name, i) => ({
    name,
    values: rows.map((r) => Number(r[i + 1]) || 0),
  }));
  return { labels, columns };
}

function fmtNum(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function InteractiveDataVisualizationDashboard({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [datasets, setDatasets] = useState<StoreDoc<Dataset>[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [metricIndex, setMetricIndex] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [csv, setCsv] = useState('');

  useEffect(() => {
    store.list<Dataset>('datasets').then((docs) => {
      setDatasets(docs);
      if (docs[0]) setSelectedId(docs[0].docId);
    });
  }, [store]);

  const selected = (datasets ?? []).find((d) => d.docId === selectedId) ?? null;
  const parsed = useMemo(() => (selected ? parseCsv(selected.data.csv) : null), [selected]);
  const metric = parsed?.columns[Math.min(metricIndex, (parsed?.columns.length ?? 1) - 1)] ?? null;

  const stats = useMemo(() => {
    if (!metric || metric.values.length === 0) return null;
    const sum = metric.values.reduce((s, v) => s + v, 0);
    return { sum, avg: sum / metric.values.length, min: Math.min(...metric.values), max: Math.max(...metric.values) };
  }, [metric]);

  async function addDataset() {
    if (!name.trim() || !parseCsv(csv)) return;
    const doc = await store.create('datasets', { name: name.trim(), csv: csv.trim() });
    setDatasets((prev) => [...(prev ?? []), doc]);
    setSelectedId(doc.docId);
    setMetricIndex(0);
    setName('');
    setCsv('');
  }

  async function removeDataset(docId: string) {
    await store.remove('datasets', docId);
    setDatasets((prev) => {
      const next = (prev ?? []).filter((d) => d.docId !== docId);
      if (selectedId === docId) setSelectedId(next[0]?.docId ?? '');
      return next;
    });
  }

  function exportData() {
    if (!selected) return;
    const blob = new Blob([selected.data.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.data.name.toLowerCase().replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (datasets === null) return <LoadingState />;

  const chartW = 560;
  const chartH = 200;
  const maxV = stats?.max || 1;
  const barGap = 8;
  const n = parsed?.labels.length ?? 0;
  const barW = n > 0 ? (chartW - barGap * (n + 1)) / n : 0;

  return (
    <div className="module-card" data-testid="data-visualization-dashboard-root">
      <Section title="Dashboard">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
          {datasets.length > 0 && (
            <div style={{ width: 240 }}>
              <Label>Dataset</Label>
              <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setMetricIndex(0); setHovered(null); }} data-testid="dataset-select" style={{ width: '100%' }}>
                {datasets.map((d) => (
                  <option key={d.docId} value={d.docId}>
                    {d.data.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {selected && (
            <Button variant="ghost" onClick={() => removeDataset(selected.docId)} data-testid="delete-dataset-button">
              🗑️
            </Button>
          )}
        </div>

        {parsed && metric ? (
          <>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }} data-testid="metric-tabs">
              {parsed.columns.map((c, i) => (
                <Tag key={c.name} active={i === metricIndex} onClick={() => { setMetricIndex(i); setHovered(null); }}>
                  {c.name}
                </Tag>
              ))}
            </div>

            <svg viewBox={`0 0 ${chartW} ${chartH + 30}`} style={{ width: '100%', maxWidth: chartW }} data-testid="bar-chart">
              {metric.values.map((v, i) => {
                const h = maxV > 0 ? (v / maxV) * (chartH - 24) : 0;
                const x = barGap + i * (barW + barGap);
                return (
                  <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }} data-testid={`bar-${i}`}>
                    <rect x={x} y={chartH - h} width={barW} height={h} rx={4} fill="var(--module-accent)" opacity={hovered === null || hovered === i ? 0.95 : 0.35} />
                    <text x={x + barW / 2} y={chartH - h - 6} textAnchor="middle" fontSize={11} fill="var(--color-text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {hovered === i ? fmtNum(v) : ''}
                    </text>
                    <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="var(--color-text-dim)">
                      {parsed.labels[i]}
                    </text>
                  </g>
                );
              })}
            </svg>

            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 12 }}>
                <StatDisplay value={<span data-testid="stat-sum">{fmtNum(stats.sum)}</span>} label={`Total ${metric.name}`} />
                <StatDisplay value={<span data-testid="stat-avg">{fmtNum(stats.avg)}</span>} label="Average" />
                <StatDisplay value={fmtNum(stats.min)} label="Minimum" />
                <StatDisplay value={fmtNum(stats.max)} label="Maximum" />
              </div>
            )}
          </>
        ) : (
          <EmptyState icon="📊">No dataset selected — paste one below.</EmptyState>
        )}
      </Section>

      <Divider />

      <Section title="Add a Dataset">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q3 Expenses" data-testid="name-input" style={{ width: '100%' }} />
            </div>
            <Button variant="primary" onClick={addDataset} data-testid="add-dataset-button" disabled={!parseCsv(csv) || !name.trim()}>
              Visualize
            </Button>
          </div>
          <div>
            <Label>CSV (First Column = Labels, Rest = Numeric Series)</Label>
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'month,spend\nJan,1200\nFeb,950'} data-testid="csv-input" rows={4} style={{ width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        </div>

        <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={exportData}>
          Export Selected Dataset as CSV
        </GatedAction>
      </Section>
    </div>
  );
}
