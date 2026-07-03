// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    plans: [
      {
        room: 'Living room, 4×5m',
        brief: 'North-facing, one window, grey sofa + oak shelf staying · style: warm minimal · problem: feels cold and echoey',
        body: '1. Anchor the seating: pull the sofa 40cm off the wall, float it on a large wool rug (240×170) — this kills most of the echo.\n2. Warm the light: swap the ceiling-only lighting for two layers — a 1.6m arc floor lamp behind the sofa and a table lamp (2700K bulbs).\n3. Soften the window wall: full-height linen curtains, hung 15cm above the frame, in oat or clay.\n4. One big texture move: a chunky knit throw + two linen cushions on the grey sofa, rust and ochre.\n5. The oak shelf: style it 60% books, 30% objects, 10% empty — add one trailing plant (pothos survives north light).',
      },
    ],
  };
}
