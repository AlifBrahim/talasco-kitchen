import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type QueueItemRow = {
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

type QueueItem = {
  orderid: number;
  tablenumber?: number | null;
  itemid: number;
  itemname: string;
  category: string;
  quantity: number;
  status: string;
  prep_time_minutes: number;
  orderdate: string;
  started_at?: string | null;
  completed_at?: string | null;
  promisedat?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? 'Food';
    const limit = parseInt(searchParams.get('limit') ?? '10');

    // Get queue items for context (ordered by order date ASC as per documentation)
    const result = await dbQuery<QueueItemRow>(`
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
        AND oi.status IN ('queued', 'prepping', 'ready')
        AND o.status IN ('open', 'in_progress', 'ready')
      ORDER BY o.orderdate ASC
      LIMIT $2
    `, [category, limit]);

    // Convert database rows to queue item format
    const queueItems: QueueItem[] = result.rows.map((row) => ({
      orderid: row.orderid,
      tablenumber: row.tablenumber ? parseInt(row.tablenumber) : null,
      itemid: row.itemid,
      itemname: row.itemname,
      category: row.category,
      quantity: row.quantity,
      status: row.status,
      prep_time_minutes: row.prep_time_minutes,
      orderdate: row.orderdate.toISOString(),
      started_at: row.started_at?.toISOString() || null,
      completed_at: row.completed_at?.toISOString() || null,
      promisedat: row.promisedat?.toISOString() || null,
    }));

    return NextResponse.json(queueItems);

  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue items' },
      { status: 500 }
    );
  }
}