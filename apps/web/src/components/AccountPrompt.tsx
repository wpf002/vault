'use client';

import { signIn } from 'next-auth/react';

type Props = {
  open: boolean;
  onClose: () => void;
  moduleName: string;
};

/**
 * The single gate in the product. The vault is sold as one product (all
 * apps included — pricing wired at the platform level, not per app), so
 * the only thing standing between a visitor and full use is an account:
 * signed-out users play with ephemeral demo data, and this prompt fires
 * when they try to save or export.
 */
export function AccountPrompt({ open, onClose, moduleName }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 420,
          width: '90%',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 20,
          padding: 'var(--space-4)',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 4 }}>Keep Your Work in {moduleName}</h3>
        <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginTop: 0 }}>
          Right now you're in a demo — nothing saves when you leave. An account keeps your data in every app in the
          Vault.
        </p>
        <button className="primary" style={{ width: '100%', margin: '12px 0 8px' }} onClick={() => signIn()}>
          Sign In or Create Account
        </button>
        <button style={{ width: '100%', background: 'transparent', border: 'none' }} onClick={onClose}>
          Not Now
        </button>
      </div>
    </div>
  );
}
