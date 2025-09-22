import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type CategoryRow = { category: string | null; items: string | number; qty: string | number };
type StatusSplit = { label: string; count: number };

export async function GET(_req: NextRequest) {
  try {
    // Items by category and total quantity
    const byCategory = await dbQuery<CategoryRow>(
      `
      SELECT 
        COALESCE("Category", 'Uncategorized') AS category,
        COUNT(*) AS items,
        COALESCE(SUM(stockquantity), 0) AS qty
      FROM ingredients
      GROUP BY COALESCE("Category", 'Uncategorized')
      ORDER BY category
      `
    );

    // Low/out status split
    const thresholds = await dbQuery<{ low: number; out: number; ok: number }>(
      `
      SELECT 
        SUM(CASE WHEN stockquantity <= 0 THEN 1 ELSE 0 END) AS out,
        SUM(CASE WHEN stockquantity > 0 AND stockquantity <= "LowThreshold" THEN 1 ELSE 0 END) AS low,
        SUM(CASE WHEN stockquantity > "LowThreshold" THEN 1 ELSE 0 END) AS ok
      FROM ingredients
      `
    );

    // Recently updated items (last 7 days)
    const recent = await dbQuery<{ id: string; name: string; qty: number; unit: string | null; updated: string }>(
      `
      SELECT 
        ingredientid::text AS id,
        ingredientname AS name,
        stockquantity::numeric AS qty,
        unit,
        "UpdatedAt" as updated
      FROM ingredients
      WHERE "UpdatedAt" >= NOW() - INTERVAL '7 days'
      ORDER BY "UpdatedAt" DESC
      LIMIT 25
      `
    );

    const t = thresholds.rows[0] ?? { low: 0, out: 0, ok: 0 } as any;
    const statusSplit: StatusSplit[] = [
      { label: 'OK', count: Number(t.ok) },
      { label: 'Low', count: Number(t.low) },
      { label: 'Out', count: Number(t.out) },
    ];

    const response = {
      byCategory: byCategory.rows.map(r => ({
        category: r.category ?? 'Uncategorized',
        items: Number(r.items),
        quantity: Number(r.qty),
      })),
      statusSplit,
      recentUpdates: recent.rows.map(r => ({
        id: r.id,
        name: r.name,
        quantity: Number(r.qty),
        unit: r.unit ?? 'ea',
        updated: r.updated instanceof Date ? r.updated.toISOString() : new Date(r.updated).toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Error generating inventory report:', err);
    return NextResponse.json({ error: 'Failed to generate inventory report' }, { status: 500 });
  }
}


