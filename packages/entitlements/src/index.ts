import { prisma } from '@vault/db';

/**
 * The whole access model in one function.
 *
 * Business model (decided 2026-07-03): the Vault is sold as ONE product —
 * every mini-app included. There is no per-app purchase. Until the
 * platform-level SKU is priced and wired to billing, every signed-in
 * account has full access; the subscription check below is what that SKU
 * will flip back on when it exists (set ENFORCE_BILLING=1).
 *
 * Signed-out visitors never reach this function — routes require auth
 * first, and the client runs preview mode with ephemeral demo data.
 */
export async function hasAccess(userId: string, _moduleSlug: string): Promise<boolean> {
  if (process.env.ENFORCE_BILLING !== '1') return Boolean(userId);

  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const subActive =
    sub?.status === 'active' &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
  return Boolean(subActive);
}

/** Returns the set of module slugs the user can access. */
export async function accessibleModules(userId: string): Promise<Set<string>> {
  if (process.env.ENFORCE_BILLING === '1') {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    const subActive =
      sub?.status === 'active' &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());
    if (!subActive) return new Set();
  }
  const all = await prisma.module.findMany({
    where: { status: 'live' },
    select: { slug: true },
  });
  return new Set(all.map((m) => m.slug));
}
