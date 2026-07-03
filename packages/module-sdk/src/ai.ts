export type AiMessage = { role: 'user' | 'assistant'; content: string };

export type AiCompleteOpts = {
  /** shorthand for a single user message; ignored when messages is given */
  prompt?: string;
  messages?: AiMessage[];
  system?: string;
  maxTokens?: number;
};

export type AiResult =
  | { ok: true; text: string; remainingPreviewCalls?: number }
  | { ok: false; reason: 'sign_in_required' | 'preview_exhausted' | 'unavailable' };

export interface AiClient {
  complete(opts: AiCompleteOpts): Promise<AiResult>;
}

type CreateAiClientOpts = {
  moduleSlug: string;
  apiBaseUrl?: string;
  /** resolves the bearer token for the signed-in user (absent → sign-in required) */
  getToken?: () => Promise<string | undefined> | string | undefined;
};

/**
 * The client half of the Phase 7 AI proxy. Unlike the store client there is
 * no ephemeral preview variant — every AI call goes to the server, which is
 * the only place the provider key and the preview allowance live. Preview
 * users get a few metered free calls (server-counted), signed-out users get
 * `sign_in_required` without a network round trip. Modules render these
 * states; they never talk to an AI provider directly.
 */
export function createAiClient(opts: CreateAiClientOpts): AiClient {
  return {
    async complete(input) {
      const token = await opts.getToken?.();
      if (!token) return { ok: false, reason: 'sign_in_required' };

      const messages = input.messages ?? (input.prompt ? [{ role: 'user' as const, content: input.prompt }] : []);
      try {
        const res = await fetch(`${opts.apiBaseUrl}/ai/${opts.moduleSlug}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, system: input.system, maxTokens: input.maxTokens }),
        });
        if (res.status === 401) return { ok: false, reason: 'sign_in_required' };
        if (res.status === 403) return { ok: false, reason: 'preview_exhausted' };
        if (!res.ok) return { ok: false, reason: 'unavailable' };
        const body = (await res.json()) as { text: string; remainingPreviewCalls?: number };
        return { ok: true, text: body.text, remainingPreviewCalls: body.remainingPreviewCalls };
      } catch {
        return { ok: false, reason: 'unavailable' };
      }
    },
  };
}
