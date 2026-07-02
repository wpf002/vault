// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Node keys are stable slugs the choices
// reference; 'start' is the entry point.
export function seedPreview() {
  return {
    nodes: [
      {
        key: 'start',
        text: 'You wake in a lighthouse. The lamp is dark, and a storm is rolling in. Stairs lead up to the lamp room and down to the door.',
        choices: [
          { label: 'Climb up to the lamp room', target: 'lamp' },
          { label: 'Head down to the door', target: 'door' },
        ],
      },
      {
        key: 'lamp',
        text: 'The great lens is intact but the wick is missing. Through the glass you spot a ship drifting toward the rocks.',
        choices: [
          { label: 'Search the supply chest', target: 'chest' },
          { label: 'Run down to signal from the shore', target: 'door' },
        ],
      },
      {
        key: 'door',
        text: 'Rain lashes the rocks. On the shore path you find a lantern — small, but bright enough to wave.',
        choices: [{ label: 'Wave the lantern at the ship', target: 'ending-shore' }],
      },
      {
        key: 'chest',
        text: 'Inside: a spare wick, dry matches, and a tin of oil. The lamp roars back to life and sweeps the sea.',
        choices: [{ label: 'Watch the ship turn away safely', target: 'ending-lamp' }],
      },
      { key: 'ending-lamp', text: 'The ship clears the rocks with room to spare. THE END — Keeper of the Light.', choices: [] },
      { key: 'ending-shore', text: 'The ship turns late, scraping past the shallows — close, but everyone is safe. THE END — The Shore Signal.', choices: [] },
    ],
  };
}
