import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';
import { GetKSMInventoryResponse } from '@shared/api';

type Row = {
  id: string;
  name: string;
  category: string | null;
  quantity: string | number | null;
  unit: string | null;
  low: string | number | null;
  updated: Date | string | null;
};

export async function GET(_req: NextRequest) {
  try {
    const result = await dbQuery<Row>(`
      SELECT
        ingredientid::text AS id,
        ingredientname     AS name,
        "Category"         AS category,
        stockquantity      AS quantity,
        unit               AS unit,
        "LowThreshold"     AS low,
        "UpdatedAt"        AS updated
      FROM ingredients
      ORDER BY ingredientname
    `);

    const items: GetKSMInventoryResponse['items'] = result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category ?? undefined,
      quantity: r.quantity != null ? Number(r.quantity) : 0,
      unit: r.unit ?? 'ea',
      low: r.low != null ? Number(r.low) : 0,
      updated: r.updated
        ? (r.updated instanceof Date ? r.updated.toISOString() : new Date(r.updated).toISOString())
        : new Date().toISOString(),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Error fetching KSM inventory:', err);
    return NextResponse.json({ error: 'Failed to fetch KSM inventory' }, { status: 500 });
  }
}