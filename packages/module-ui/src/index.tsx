import type { ReactNode } from 'react';
import type { ModuleMode } from '@vault/module-sdk';

/**
 * Small shared UI kit every module reuses so building app #6..120 is "fill
 * in the domain logic," not "rebuild empty states and gated buttons."
 * Styling rides on the shell's globals.css classes (card, button, badge,
 * input) — this package doesn't ship its own stylesheet.
 */

type GatedActionProps = {
  mode: ModuleMode;
  requestUpgrade: () => void;
  onAction: () => void;
  children: ReactNode;
  className?: string;
};

/**
 * A button for an action that must be walled in preview (export, download,
 * anything that isn't ephemeral CRUD). In full mode it just runs onAction;
 * in preview it surfaces the buy wall instead. This is UX only — the real
 * enforcement is server-side on the store API (apps/api/src/routes/store.ts).
 */
export function GatedAction({ mode, requestUpgrade, onAction, children, className }: GatedActionProps) {
  return (
    <button className={className} onClick={mode === 'full' ? onAction : requestUpgrade} data-testid="gated-action">
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="card" data-testid="empty-state" style={{ color: 'var(--color-text-dim)', textAlign: 'center' }}>
      {children}
    </div>
  );
}

export function LoadingState() {
  return (
    <div data-testid="loading-state" style={{ color: 'var(--color-text-dim)' }}>
      Loading…
    </div>
  );
}
