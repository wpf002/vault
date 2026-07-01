import { prisma } from '@vault/db';

/**
 * The whole access model in one function.
 * A user can use a module if EITHER:
 *   - they have an active subscription (all-access), OR
 *   - they have a one-time purchase of that specific module.
 */
export async function hasAccess(userId: string, moduleSlug: string): Promise<boolean> {
  const [sub, purchase] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.purchase.findFirst({
      where: { userId, module: { slug: moduleSlug } },
    }),
  ]);

  const subActive =
    sub?.status === 'active' &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

  return Boolean(subActive || purchase);
}

/** Returns the set of module slugs the user can access. */
export async function accessibleModules(userId: string): Promise<Set<string>> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const subActive =
    sub?.status === 'active' &&
    (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date());

  if (subActive) {
    const all = await prisma.module.findMany({
      where: { status: 'live' },
      select: { slug: true },
    });
    return new Set(all.map((m) => m.slug));
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId },
    select: { module: { select: { slug: true } } },
  });
  return new Set(purchases.map((p) => p.module.slug));
}
