import type { FastifyInstance } from 'fastify';
import type Stripe from 'stripe';
import { prisma } from '@vault/db';
import { requireAuth } from '../plugins/auth.js';
import { stripe } from '../lib/stripe.js';

// Phase 2 scaffold — routes are structurally complete but NOT wired to a
// real Stripe account yet (no live checkout, no webhook testing). Fill in
// STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / price IDs and verify with the
// Stripe CLI webhook simulator before this is load-bearing.

export async function registerBillingRoutes(app: FastifyInstance) {
  // Subscription checkout — the hero SKU, unlocks every live module.
  app.post('/billing/checkout/subscription', { preHandler: requireAuth }, async (req, reply) => {
    const priceId = process.env.STRIPE_PRICE_SUBSCRIPTION;
    if (!priceId) return reply.code(500).send({ error: 'STRIPE_PRICE_SUBSCRIPTION not configured' });

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      customer_email: req.user!.email,
      client_reference_id: req.user!.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL}/account?checkout=success`,
      cancel_url: `${process.env.WEB_URL}/account?checkout=cancelled`,
    });
    return { url: session.url };
  });

  // One-time unlock checkout for a single module.
  app.post<{ Params: { slug: string } }>(
    '/billing/checkout/module/:slug',
    { preHandler: requireAuth },
    async (req, reply) => {
      const module = await prisma.module.findUnique({ where: { slug: req.params.slug } });
      if (!module?.stripePriceId) {
        return reply.code(404).send({ error: 'Module not found or not individually sellable' });
      }

      const session = await stripe().checkout.sessions.create({
        mode: 'payment',
        customer_email: req.user!.email,
        client_reference_id: req.user!.id,
        line_items: [{ price: module.stripePriceId, quantity: 1 }],
        metadata: { moduleId: module.id, userId: req.user!.id },
        success_url: `${process.env.WEB_URL}/modules/${module.slug}?checkout=success`,
        cancel_url: `${process.env.WEB_URL}/modules/${module.slug}?checkout=cancelled`,
      });
      return { url: session.url };
    },
  );

  // Stripe-hosted customer portal — cancel/update payment method, no UI of our own.
  app.post('/billing/portal', { preHandler: requireAuth }, async (req, reply) => {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user!.id } });
    if (!sub?.stripeCustomerId) return reply.code(404).send({ error: 'No billing account on file' });

    const session = await stripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.WEB_URL}/account`,
    });
    return { url: session.url };
  });

  // Webhooks are the sole source of truth for entitlements. Every handler
  // below must be an idempotent upsert — Stripe retries deliveries, and the
  // @@unique constraints on Purchase/Subscription exist precisely so retries
  // can't double-write.
  app.post(
    '/billing/webhook',
    { config: { rawBody: true } },
    async (req, reply) => {
      const signature = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!signature || !webhookSecret) return reply.code(400).send({ error: 'Missing signature or webhook secret' });

      let event: Stripe.Event;
      try {
        event = stripe().webhooks.constructEvent((req as unknown as { rawBody: string }).rawBody, signature, webhookSecret);
      } catch (err) {
        req.log.warn({ err }, 'Stripe webhook signature verification failed');
        return reply.code(400).send({ error: 'Invalid signature' });
      }

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        default:
          break; // ignore everything else
      }

      return { received: true };
    },
  );
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Subscriptions are reconciled via customer.subscription.* — this handler
  // only writes the one-time-unlock Purchase row.
  if (session.mode !== 'payment') return;
  const userId = session.metadata?.userId ?? session.client_reference_id;
  const moduleId = session.metadata?.moduleId;
  if (!userId || !moduleId) return;

  await prisma.purchase.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      userId,
      moduleId,
      amountCents: session.amount_total ?? 0,
      stripePaymentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    },
    update: {}, // already recorded — retried delivery, nothing to change
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return; // set this in the Checkout Session's subscription_data.metadata

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      status: mapStripeStatus(sub.status),
      stripeSubscriptionId: sub.id,
      stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
    update: {
      status: mapStripeStatus(sub.status),
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: 'canceled' },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  if (typeof charge.payment_intent !== 'string') return;
  await prisma.purchase.deleteMany({ where: { stripePaymentId: charge.payment_intent } });
}

function mapStripeStatus(status: Stripe.Subscription.Status): 'active' | 'past_due' | 'canceled' {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  return 'canceled';
}
