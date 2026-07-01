'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <Link href="/" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
        vault
      </Link>
      <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link href="/">Catalog</Link>
        {status === 'authenticated' ? (
          <>
            <Link href="/library">Library</Link>
            <Link href="/account">Account</Link>
            <button onClick={() => signOut()}>Sign out</button>
          </>
        ) : (
          <Link href="/login">
            <button className="primary">Sign in</button>
          </Link>
        )}
      </nav>
    </header>
  );
}
