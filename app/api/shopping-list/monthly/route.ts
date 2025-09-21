import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

const AGENT_URL = process.env.STRANDS_API_URL || 'http://127.0.0.1:8000';

type Row = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  current_stock: string | number | null;
  monthly_usage: string | number | null;
  low_threshold: string | number | null;
};

export async function GET(req: NextRequest) {
  try {
    const source = req.nextUrl.searchParams.get('source');

    if (source === 'agent') {
      const res = await fetch(`${AGENT_URL}/agents/inventory_controller/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Return monthly shopping list JSON for the next 30 days. Use tools.' }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Agent error: ${text}` }, { status: 502 });
      }
      const payload = await res.json();
      // payload.output should be strict JSON per prompt
      const parsed = JSON.parse(payload.output);
      // Ensure we do not return zero quantities
      const items = Array.isArray(parsed.items) ? parsed.items.filter((i: any) => (i?.recommendedQty ?? 0) > 0) : [];
      return NextResponse.json({ items });
    }

  const result = await dbQuery<Row>(
    `WITH month_orders AS (
       SELECT oi.itemid AS item_id,
              SUM(oi.quantity) AS qty
       FROM orderitems oi
       JOIN orders o ON o.orderid = oi.orderid
       WHERE o.orderdate >= (now() - interval '30 days')
       GROUP BY oi.itemid
     ),
     ingredient_usage AS (
       SELECT mii.ingredientid AS ingredient_id,
              SUM(mo.qty * mii.quantityneeded) AS monthly_usage
       FROM month_orders mo
       JOIN menuitemingredients mii ON mii.itemid = mo.item_id
       GROUP BY mii.ingredientid
     )
     SELECT i.ingredientid::text AS id,
            i.ingredientname     AS name,
            i."Category"        AS category,
            i.unit               AS unit,
            i.stockquantity      AS current_stock,
            COALESCE(u.monthly_usage, 0) AS monthly_usage,
            i."LowThreshold"    AS low_threshold
     FROM ingredients i
     LEFT JOIN ingredient_usage u ON u.ingredient_id = i.ingredientid
     ORDER BY u.monthly_usage DESC NULLS LAST`
  );

  const items = result.rows
    .map((r) => {
      const currentStock = r.current_stock != null ? Number(r.current_stock) : 0;
      const monthlyUsage = r.monthly_usage != null ? Number(r.monthly_usage) : 0;
      const low = r.low_threshold != null ? Number(r.low_threshold) : 0;
      const recommended = Math.max(monthlyUsage - currentStock, 0);

      if (recommended <= 0) return null; // filter out zero or negative recommendations

      let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (currentStock <= 0) urgency = 'critical';
      else if (currentStock < low) urgency = 'high';
      else if (recommended > 0) urgency = 'medium';

      const reasonParts: string[] = [];
      reasonParts.push(`Projected 30d usage ${monthlyUsage.toFixed(2)} ${r.unit ?? ''}`.trim());
      reasonParts.push(`On hand ${currentStock.toFixed(2)} ${r.unit ?? ''}`.trim());
      if (low > 0) reasonParts.push(`Par ${low.toFixed(2)} ${r.unit ?? ''}`.trim());

      return {
        id: r.id,
        name: r.name,
        category: r.category ?? 'Uncategorized',
        currentStock,
        unit: r.unit ?? 'ea',
        recommendedQty: Number(recommended.toFixed(2)),
        urgency,
        reason: reasonParts.join(' · '),
        estimatedCost: 0,
      };
    })
    .filter(Boolean);

    return NextResponse.json({ items });
  } catch (err) {
    console.error('Error generating monthly shopping list:', err);
    return NextResponse.json({ error: 'Failed to generate monthly shopping list' }, { status: 500 });
  }
}


