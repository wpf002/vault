import { useEffect, useState } from 'react';
import type { ModuleComponentProps } from '@vault/module-sdk';
import { GatedAction, EmptyState, LoadingState } from '@vault/module-ui';

type Item = { title: string; note: string };

// Basic Unit Converter — Convert length, weight, and temperature units.
// Fill in the domain logic. Keep persistence on `store` and gated actions
// on GatedAction — see modules/CONTRACT.md before shipping this live.
export function BasicUnitConverter({ mode, store, requestUpgrade }: ModuleComponentProps) {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    store.list<Item>('items').then((docs) => setItems(docs.map((d) => d.data)));
  }, [store]);

  if (items === null) return <LoadingState />;

  return (
    <div className="card" data-testid="unit-converter-root">
      {items.length === 0 ? (
        <EmptyState>Nothing here yet.</EmptyState>
      ) : (
        <ul>
          {items.map((item, i) => (
            <li key={i}>{item.title}</li>
          ))}
        </ul>
      )}
      <GatedAction mode={mode} requestUpgrade={requestUpgrade} onAction={() => {}} className="primary">
        Export
      </GatedAction>
    </div>
  );
}
