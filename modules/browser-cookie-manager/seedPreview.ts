// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    audits: [
      {
        site: 'news-site.example',
        cookies: [
          { name: 'session_id', classification: 'essential', note: 'Keeps you logged in — the site breaks without it', verdict: 'keep' },
          { name: '_ga / _gid', classification: 'analytics', note: 'Google Analytics visitor tracking across sessions', verdict: 'block' },
          { name: 'fbp', classification: 'advertising', note: 'Meta pixel — builds an ad profile from your reading habits', verdict: 'block' },
          { name: 'theme_pref', classification: 'functional', note: 'Remembers dark mode — harmless convenience', verdict: 'keep' },
        ],
      },
    ],
  };
}
