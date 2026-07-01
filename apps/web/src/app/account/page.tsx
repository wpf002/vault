import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiFetchServer } from '@/lib/api-server';
import { ManageBillingButton } from '@/components/ManageBillingButton';

type AccountData = {
  email: string;
  subscription: { status: string; currentPeriodEnd: string | null } | null;
  purchases: { amountCents: number; createdAt: string; module: { slug: string; name: string } }[];
};

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <main style={{ padding: 'var(--space-5) var(--space-4)' }}>
        <p>
          <Link href="/login">Sign in</Link> to see your account.
        </p>
      </main>
    );
  }

  const res = await apiFetchServer('/account');
  const account: AccountData | null = res.ok ? await res.json() : null;

  return (
    <main style={{ padding: 'var(--space-5) var(--space-4)', maxWidth: 700, margin: '0 auto' }}>
      <h1>Account</h1>
      <p style={{ color: 'var(--color-text-dim)' }}>{account?.email}</p>

      <section className="card" style={{ marginBottom: 'var(--space-3)' }}>
        <h3 style={{ marginTop: 0 }}>Subscription</h3>
        {account?.subscription ? (
          <>
            <p>
              Status: <strong>{account.subscription.status}</strong>
              {account.subscription.currentPeriodEnd
                ? ` — renews ${new Date(account.subscription.currentPeriodEnd).toLocaleDateString()}`
                : null}
            </p>
            <ManageBillingButton />
          </>
        ) : (
          <p style={{ color: 'var(--color-text-dim)' }}>No active subscription.</p>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Purchase history</h3>
        {account?.purchases.length ? (
          <ul style={{ paddingLeft: 16 }}>
            {account.purchases.map((p) => (
              <li key={p.module.slug}>
                {p.module.name} — ${(p.amountCents / 100).toFixed(2)} —{' '}
                {new Date(p.createdAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--color-text-dim)' }}>No one-time purchases yet.</p>
        )}
      </section>
    </main>
  );
}
