import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@vault/db';
import { hasAccess } from '@vault/entitlements';
import { requireAuth } from '../plugins/auth.js';

/**
 * Phase 7 — the AI proxy. The ONLY place AI provider calls happen.
 * ANTHROPIC_API_KEY lives here and never reaches a client; modules call
 * this route through the SDK's AiClient. Gate order per request:
 *
 *   1. signed in (AI is meterable-only — no anonymous calls, even preview)
 *   2. rate limit (per user, in-memory token bucket)
 *   3. entitled → unlimited; unentitled → PREVIEW_AI_CALLS lifetime free
 *      calls per module (counted from AiUsage rows), then 403 + the wall
 *   4. call the provider, meter tokens into AiUsage
 *
 * Providers: 'anthropic' (default when ANTHROPIC_API_KEY is set) or
 * 'stub' (AI_PROVIDER=stub — deterministic echo for dev/CI so the whole
 * gate/meter pipeline is testable without a key or spend). No key and
 * no stub → 503, never a fake answer.
 */

type Msg = { role: 'user' | 'assistant'; content: string };
type CompleteBody = { messages: Msg[]; system?: string; maxTokens?: number };

const PREVIEW_AI_CALLS = Number(process.env.PREVIEW_AI_CALLS ?? 5);
const MAX_OUTPUT_TOKENS = 1024;
const AI_MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001';

// Per-user sliding-window rate limit. In-memory is fine for a single API
// process; a multi-instance deploy moves this to Redis (Phase 9 concern).
const RATE_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_MIN ?? 20);
const windows = new Map<string, number[]>();
function rateLimited(userId: string): boolean {
  const now = Date.now();
  const window = (windows.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (window.length >= RATE_LIMIT) {
    windows.set(userId, window);
    return true;
  }
  window.push(now);
  windows.set(userId, window);
  return false;
}

type ProviderResult = { text: string; inputTokens: number; outputTokens: number };

async function callAnthropic(body: CompleteBody): Promise<ProviderResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: Math.min(body.maxTokens ?? MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS),
      ...(body.system ? { system: body.system } : {}),
      messages: body.messages,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    content: { type: string; text?: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  return {
    text: json.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join(''),
    inputTokens: json.usage.input_tokens,
    outputTokens: json.usage.output_tokens,
  };
}

// Deterministic dev provider: proves auth/allowance/metering end to end
// with zero spend. Clearly labeled so it can never pass as a real answer.
async function callStub(body: CompleteBody): Promise<ProviderResult> {
  const last = body.messages[body.messages.length - 1]?.content ?? '';
  const text = `[stub completion] You said: "${last.slice(0, 120)}"`;
  return { text, inputTokens: Math.ceil(last.length / 4), outputTokens: Math.ceil(text.length / 4) };
}

function provider(): ((body: CompleteBody) => Promise<ProviderResult>) | null {
  if (process.env.AI_PROVIDER === 'stub') return callStub;
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic;
  return null;
}

type Params = { module: string };

async function requireSignedIn(req: FastifyRequest<{ Params: Params }>, reply: FastifyReply) {
  await requireAuth(req, reply);
}

export async function registerAiRoutes(app: FastifyInstance) {
  app.post<{ Params: Params; Body: CompleteBody }>(
    '/ai/:module/complete',
    { preHandler: requireSignedIn },
    async (req, reply) => {
      const call = provider();
      if (!call) return reply.code(503).send({ error: 'AI is not configured on this server' });

      const userId = req.user!.id;
      const moduleSlug = req.params.module;

      if (!Array.isArray(req.body?.messages) || req.body.messages.length === 0) {
        return reply.code(400).send({ error: 'messages is required' });
      }
      const totalChars = req.body.messages.reduce((s, m) => s + (m.content?.length ?? 0), 0);
      if (totalChars > 20_000) {
        return reply.code(400).send({ error: 'Prompt too large' });
      }

      if (rateLimited(userId)) {
        return reply.code(429).send({ error: 'Too many AI requests — slow down a little' });
      }

      const entitled = await hasAccess(userId, moduleSlug);
      let remainingPreviewCalls: number | null = null;
      if (!entitled) {
        const used = await prisma.aiUsage.count({ where: { userId, moduleSlug, preview: true } });
        if (used >= PREVIEW_AI_CALLS) {
          return reply.code(403).send({ error: 'Preview AI allowance used up', code: 'preview_exhausted' });
        }
        remainingPreviewCalls = PREVIEW_AI_CALLS - used - 1;
      }

      const result = await call(req.body).catch((err) => {
        req.log.error(err, 'AI provider call failed');
        return null;
      });
      if (!result) return reply.code(502).send({ error: 'AI provider request failed' });

      await prisma.aiUsage.create({
        data: {
          userId,
          moduleSlug,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          preview: !entitled,
        },
      });

      return {
        text: result.text,
        ...(remainingPreviewCalls !== null ? { remainingPreviewCalls } : {}),
      };
    },
  );
}
