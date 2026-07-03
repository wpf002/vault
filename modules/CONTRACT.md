# Module contract

Every module in `modules/<slug>/` must satisfy this before it ships. The
generator (`pnpm gen:module <slug>`) stamps out a folder that already
satisfies it — deviate on purpose, not by accident.

1. **Default-exports a `defineModule()` manifest** (`@vault/module-sdk`)
   whose `slug` matches the `Module.slug` row in the catalog exactly.
2. **`seedPreview()` returns realistic demo data.** Preview users never see
   an empty app — that's the "try it free" pitch. No network calls, no
   randomness that breaks between renders.
3. **Handles empty and loading states** using `@vault/module-ui`'s
   `EmptyState` / `LoadingState` — don't hand-roll new ones per module.
4. **Every interactive element has `data-testid`.** Kebab-case, scoped to
   what it does (`data-testid="add-note-button"`, not `data-testid="btn1"`).
5. **All persistence goes through the `store` prop**, never a raw `fetch`
   to `/store/...`. The store client is what makes preview ephemeral and
   full mode real — bypassing it breaks both the demo and the buy wall.
6. **Gated actions (export, download, anything beyond ephemeral CRUD)
   use `GatedAction`** from `@vault/module-ui`, calling `requestUpgrade()`
   in preview instead of performing the action.
7. **The module never checks `hasAccess` or entitlements itself.** It
   only ever sees `mode: 'preview' | 'full'`, handed down by the shell.
   The store API is what actually enforces access — the module doesn't
   need to and shouldn't try to duplicate that check.
8. **No module-specific auth, billing, or checkout code.** Those are
   platform concerns (`@vault/entitlements`, the Fastify billing routes).
9. **Looks like itself, not the shell.** Use `@vault/module-ui`'s `Button`
   (or `GatedAction`, which already renders one) for this app's own
   actions — they pick up `theme.accent` from the manifest automatically.
   Don't reach for the shell's `.primary` class or `--color-accent`
   inside a module; that's the platform's own identity (nav, catalog,
   buy wall), not this app's. `gen:module` defaults `theme.accent` from
   the catalog category — override it in `index.ts` if something more
   specific to what this app actually does fits better.
10. **Reads as a real app, not a scaffold.** Use `@vault/module-ui`'s
    `Input`/`Select`/`Label`/`Section`/`Divider`/`StatDisplay` — don't
    drop back to bare `<input>`/`<ul>` once the domain logic grows past
    what the generator stamped out. See DESIGN.md at the repo root for
    the full baseline (colors, casing, icons, component inventory);
    `unit-converter` is the reference implementation.

11. **AI goes through the proxy, and only the proxy.** Modules with
    `requiresAi: true` use the `ai` prop (`AiClient`) from
    `ModuleComponentProps` — never a provider SDK, never an API key,
    never a hardcoded fake answer. `ai.complete()` returns a
    discriminated result; the module must render all three failure
    states: `sign_in_required` (prompt to sign in — AI needs an account
    even in preview), `preview_exhausted` (surface `requestUpgrade()` —
    the free allowance is spent), and `unavailable` (a calm "AI is
    offline" state, not a crash). When `remainingPreviewCalls` comes
    back, show it — the countdown is the upsell.

Before flipping a module's catalog `status` to `live`, confirm it holds
this contract — not just that it compiles.
