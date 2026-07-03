// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    phrasebook: [
      { original: 'Where is the train station?', language: 'Japanese', translation: '駅はどこですか？ (Eki wa doko desu ka?)', pronunciation: 'EH-kee wah DOH-koh dess kah', etiquette: 'Add "sumimasen" (excuse me) first — flagging a stranger without it feels abrupt.' },
      { original: 'The bill, please', language: 'Japanese', translation: 'お会計お願いします (O-kaikei onegaishimasu)', pronunciation: 'oh-KAI-kay oh-neh-gai-shee-mass', etiquette: 'Cross your index fingers into an X — the universal check-please gesture in casual spots. Never tip.' },
      { original: 'Do you have a vegetarian option?', language: 'Italian', translation: 'Avete un piatto vegetariano?', pronunciation: 'ah-VEH-teh oon PYAT-toh veh-jeh-tah-RYAH-noh', etiquette: 'Ask before ordering, not after — menus rarely mark it. "Senza carne" (without meat) helps.' },
    ],
  };
}
