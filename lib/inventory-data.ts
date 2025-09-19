export type InventoryItem = {
  id: string;
  name: string;
  category: (typeof CATEGORIES)[number];
  qty: number;
  unit: 'kg' | 'g' | 'l' | 'ml' | 'pcs' | string;
  minLevel: number;
  location: string;
  updatedAt: string;
};

export const CATEGORIES = ['vegetables', 'meat', 'dairy', 'grains', 'condiments', 'seafood'] as const;

export function computeStatus(i: InventoryItem): 'ok' | 'low' | 'out' {
  if (i.qty <= 0) return 'out';
  if (i.qty <= i.minLevel) return 'low';
  return 'ok';
}

export function formatQty(qty: number, unit: string) {
  return `${qty} ${unit}`;
}

export const seedInventory: InventoryItem[] = [
  { id: 'tomatoes', name: 'Tomatoes', category: 'vegetables', qty: 15, unit: 'kg', minLevel: 8, location: 'L1', updatedAt: iso(-120) },
  { id: 'chicken', name: 'Chicken Breast', category: 'meat', qty: 1, unit: 'kg', minLevel: 3, location: 'L2', updatedAt: iso(-90) },
  { id: 'milk', name: 'Milk', category: 'dairy', qty: 0, unit: 'l', minLevel: 2, location: 'L1', updatedAt: iso(-60) },
  { id: 'olive-oil', name: 'Olive Oil', category: 'condiments', qty: 8, unit: 'l', minLevel: 5, location: 'L3', updatedAt: iso(-40) },
  { id: 'onions', name: 'Onions', category: 'vegetables', qty: 24, unit: 'kg', minLevel: 10, location: 'L2', updatedAt: iso(-30) },
  { id: 'rice', name: 'Rice', category: 'grains', qty: 6, unit: 'kg', minLevel: 8, location: 'L2', updatedAt: iso(-25) },
  { id: 'cheese', name: 'Cheese', category: 'dairy', qty: 12, unit: 'kg', minLevel: 6, location: 'L1', updatedAt: iso(-20) },
  { id: 'salt', name: 'Salt', category: 'condiments', qty: 0, unit: 'kg', minLevel: 2, location: 'L3', updatedAt: iso(-10) }
];

function iso(minAgo: number) {
  return new Date(Date.now() + minAgo * 60 * 1000).toISOString();
}
