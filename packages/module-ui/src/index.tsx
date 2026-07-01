import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ModuleMode } from '@vault/module-sdk';

/**
 * Small shared UI kit every module reuses so building app #6..120 is "fill
 * in the domain logic," not "rebuild empty states and gated buttons."
 * `Button` and `GatedAction` render off `--module-accent`, the CSS variable
 * ModuleRuntime sets per module from its manifest's `theme.accent` — this
 * is what makes each app look like itself instead of a clone of the shell.
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
};

export function Button({ variant = 'secondary', className, ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'module-btn-primary' : 'module-btn-secondary';
  return <button className={[variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}

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
    <Button
      variant="primary"
      className={className}
      onClick={mode === 'full' ? onAction : requestUpgrade}
      data-testid="gated-action"
    >
      {children}
    </Button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="module-card" data-testid="empty-state" style={{ color: 'var(--color-text-dim)', textAlign: 'center' }}>
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
