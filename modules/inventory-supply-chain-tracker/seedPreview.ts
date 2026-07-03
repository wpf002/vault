// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2. Money is integer cents (platform invariant).
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

export function seedPreview() {
  return {
    skus: [
      { sku: 'MUG-11', name: 'Ceramic Mug 11oz', onHand: 142, reorderPoint: 50, unitCostCents: 480 },
      { sku: 'TEE-M-BLK', name: 'Logo Tee (M, Black)', onHand: 23, reorderPoint: 40, unitCostCents: 750 },
      { sku: 'STK-PK10', name: 'Sticker Pack (10)', onHand: 310, reorderPoint: 100, unitCostCents: 120 },
      { sku: 'TOTE-CNV', name: 'Canvas Tote', onHand: 8, reorderPoint: 25, unitCostCents: 620 },
    ],
    shipments: [
      { sku: 'TEE-M-BLK', qty: 120, supplier: 'Brightline Apparel', eta: daysFromNow(4), status: 'in_transit' },
      { sku: 'TOTE-CNV', qty: 80, supplier: 'Harbor Textiles', eta: daysFromNow(9), status: 'ordered' },
      { sku: 'MUG-11', qty: 200, supplier: 'Kilnworks Co.', eta: daysFromNow(-2), status: 'received' },
    ],
  };
}
