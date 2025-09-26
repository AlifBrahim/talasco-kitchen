import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

const AGENT_URL = process.env.STRANDS_API_URL || 'http://localhost:8000';

type OrderItemRow = {
  orderid: number;
  itemid: number;
  itemname: string;
  category: string;
  quantity: number;
  status: string;
  started_at: Date | null;
  completed_at: Date | null;
  prep_time_minutes: number;
  orderdate: Date;
  tablenumber: string | null;
  promisedat: Date | null;
};

type AgentRecommendation = {
  action: string;
  reason: string;
  risks?: string | null;
  payload?: {
    orderid?: number;
    itemid?: number;
    score?: number;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? 'Food';
    const limit = parseInt(searchParams.get('limit') ?? '8');
    const source = searchParams.get('source');

    // If source=agent, use the AI agent (for future use)
    if (source === 'agent') {
      const res = await fetch(`${AGENT_URL}/agents/station_dispatcher/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `Get the next ${limit} items to cook for ${category} category. Prioritize by prep time and SLA risk.` 
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({ error: `Agent error: ${text}` }, { status: 502 });
      }
      const payload = await res.json();
      // Parse agent response and format as recommendations
      const parsed = JSON.parse(payload.output);
      return NextResponse.json(Array.isArray(parsed) ? parsed : []);
    }

    // Direct database query approach (no AI)
    const result = await dbQuery<OrderItemRow>(`
      SELECT 
        oi.orderid,
        oi.itemid,
        mi.itemname,
        mi.category,
        oi.quantity,
        oi.status,
        oi.started_at,
        oi.completed_at,
        mi.prep_time_minutes,
        o.orderdate,
        o.tablenumber,
        o.promisedat
      FROM orderitems oi
      JOIN menuitems mi ON mi.itemid = oi.itemid
      JOIN orders o ON o.orderid = oi.orderid
      WHERE mi.category = $1
        AND oi.status IN ('queued', 'prepping')
        AND o.status IN ('open', 'in_progress')
      ORDER BY 
        -- FIFO: oldest orders first
        o.orderdate ASC,
        -- Stable tie-breakers
        oi.orderid ASC,
        oi.itemid ASC
      LIMIT $2
    `, [category, limit]);

    // Convert database rows to agent recommendation format
    const recommendations: AgentRecommendation[] = result.rows.map((row, index) => {
      const waitMinutes = Math.floor((Date.now() - new Date(row.orderdate).getTime()) / (1000 * 60));
      return {
        action: `Do now: Order ${row.orderid} · ${row.itemname}`,
        reason: `FIFO · placed ${Math.max(0, waitMinutes)}m ago`,
        risks: null,
        payload: {
          orderid: row.orderid,
          itemid: row.itemid,
          score: 1.0 - (index * 0.1)
        }
      };
    });

    return NextResponse.json(recommendations);

  } catch (error) {
    console.error('Station dispatcher error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch station dispatcher recommendations' },
      { status: 500 }
    );
  }
}
