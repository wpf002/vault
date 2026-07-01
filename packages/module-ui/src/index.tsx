import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import type { ModuleMode } from '@vault/module-sdk';

/**
 * The shared UI kit every module reuses — this is what makes app #6..120
 * "fill in the domain logic," not "rebuild inputs, empty states, and a
 * loading spinner from scratch." Everything here renders off
 * `--module-accent`, the CSS variable ModuleRuntime sets per module from
 * its manifest's `theme.accent` — a module's own visual identity, not the
 * shell's. See modules/CONTRACT.md #9-10 and DESIGN.md at the repo root
 * for the full baseline this library is expected to hold to.
 */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ variant = 'secondary', className, ...rest }: ButtonProps) {
  const variantClass =
    variant === 'primary' ? 'module-btn-primary' : variant === 'ghost' ? 'module-btn-ghost' : 'module-btn-secondary';
  return <button className={[variantClass, className].filter(Boolean).join(' ')} {...rest} />;
}

/** A small round button for a row-level action (delete, edit) — not a primary CTA. */
export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button aria-label={label} title={label} className={['module-icon-btn', className].filter(Boolean).join(' ')} {...rest} />
  );
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
 * in preview it surfaces the buy wall instead — and shows a small lock so
 * the gating reads as a feature, not a broken button. This is UX only —
 * the real enforcement is server-side on the store API
 * (apps/api/src/routes/store.ts).
 */
export function GatedAction({ mode, requestUpgrade, onAction, children, className }: GatedActionProps) {
  return (
    <Button
      variant="primary"
      className={className}
      onClick={mode === 'full' ? onAction : requestUpgrade}
      data-testid="gated-action"
    >
      {mode === 'preview' && <span aria-hidden style={{ marginRight: 6 }}>🔒</span>}
      {children}
    </Button>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input className={['module-input', className].filter(Boolean).join(' ')} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return (
    <div className="module-select-wrap">
      <select className={['module-select', className].filter(Boolean).join(' ')} {...rest} />
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="module-label">{children}</label>;
}

/** A titled panel for grouping related controls — the basic layout unit inside a module. */
export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="module-section">
      {title && <h4 className="module-section-title">{title}</h4>}
      {children}
    </section>
  );
}

export function Divider() {
  return <hr className="module-divider" />;
}

type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** An iOS-style tab switcher — the standard way a module lets a user pick one of a few modes/categories. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="module-segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'active' : undefined}
          data-testid={`segment-${o.value}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A large, tabular-nums readout for a headline number — a conversion result, a running total, a score. */
export function StatDisplay({ value, label }: { value: ReactNode; label?: string }) {
  return (
    <div className="module-stat" data-testid="stat-display">
      <div className="module-stat-value">{value}</div>
      {label && <div className="module-stat-label">{label}</div>}
    </div>
  );
}

/** A single row in a list — consistent hover state and an optional trailing remove action. */
export function ListRow({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <div className="module-list-row">
      <div className="module-list-row-content">{children}</div>
      {onRemove && (
        <IconButton label="Remove" onClick={onRemove}>
          ✕
        </IconButton>
      )}
    </div>
  );
}

export function EmptyState({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <div className="module-empty" data-testid="empty-state">
      {icon && (
        <div className="module-empty-icon" aria-hidden>
          {icon}
        </div>
      )}
      <p>{children}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="module-loading" data-testid="loading-state">
      <span className="module-spinner" aria-hidden />
      Loading…
    </div>
  );
}
