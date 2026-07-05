'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 24px',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {status === 'authenticated' ? (
        <Link href="/" style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>
          Vault
        </Link>
      ) : (
        // Signed out, the only page is the login front door — the brand is
        // just a wordmark, not a link back into a catalog you can't see yet.
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.03em' }}>Vault</span>
      )}
      {status === 'authenticated' && (
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 14 }}>
          <Link href="/">Catalog</Link>
          <Link href="/library">Library</Link>
          <Link href="/account">Account</Link>
          <button onClick={() => signOut()}>Sign out</button>
        </nav>
      )}
    </header>
  );
}
