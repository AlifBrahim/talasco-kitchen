import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type SimpleOrderRow = {
  orderid: number;
  tablenumber: string | null;
  status: string;
  orderdate: Date;
  started_at: Date | null;
  completed_at: Date | null;
  itemid: number;
  itemname: string;
  quantity: number;
  sku: string;
  price: number;
  category: string;
  prep_time_minutes: number | null;
  oi_status: string;
  oi_started_at: Date | null;
  oi_completed_at: Date | null;
  oi_notes: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    let whereClause = '';
    const values: string[] = [];

    if (statusFilter) {
      const statuses = statusFilter.split(',');
      const placeholders = statuses.map((_, index) => `$${index + 1}`).join(',');
      whereClause = `WHERE o.status IN (${placeholders})`;
      values.push(...statuses);
    }

    const result = await dbQuery<SimpleOrderRow>(`
      SELECT 
        o.orderid,
        o.tablenumber,
        o.status,
        o.orderdate,
        o.started_at,
        o.completed_at,
        oi.itemid,
        m.itemname,
        oi.quantity,
        m.sku,
        m.price,
        m.category,
        m.prep_time_minutes,
        oi.status AS oi_status,
        oi.started_at AS oi_started_at,
        oi.completed_at AS oi_completed_at,
        oi.notes AS oi_notes
      FROM orders o
      JOIN orderitems oi ON o.orderid = oi.orderid
      JOIN menuitems m ON oi.itemid = m.itemid
      ${whereClause}
      ORDER BY o.orderdate DESC
    `, values);

    // Group by order
    const ordersMap = new Map();
    
    result.rows.forEach(row => {
      const orderId = row.orderid.toString();
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          id: orderId,
          table_number: row.tablenumber,
          customer_name: null, // Not in your schema
          status: row.status,
          source: 'dine_in', // Default since not in your schema
          placed_at: row.orderdate.toISOString(),
          started_at: row.started_at ? row.started_at.toISOString() : null,
          completed_at: row.completed_at ? row.completed_at.toISOString() : null,
          promised_at: null,
          order_items: []
        });
      }
      
      const order = ordersMap.get(orderId);
      order.order_items.push({
        id: `${orderId}-${row.itemid}`,
        order_id: orderId,
        qty: row.quantity,
        notes: row.oi_notes,
        status: (row.oi_status || 'queued') as any,
        predicted_prep_minutes: row.prep_time_minutes ?? null,
        actual_prep_seconds: null,
        created_at: row.orderdate.toISOString(),
        started_at: row.oi_started_at ? row.oi_started_at.toISOString() : null,
        completed_at: row.oi_completed_at ? row.oi_completed_at.toISOString() : null,
        menu_item: {
          id: row.itemid.toString(),
          name: row.itemname,
          sku: row.sku,
          category: row.category,
          price: Number(row.price),
          is_active: true,
          org_id: '1',
          created_at: row.orderdate.toISOString(),
          avg_prep_minutes: row.prep_time_minutes ?? undefined
        },
        kds_tickets: []
      });
    });

    const orders = Array.from(ordersMap.values());

    return NextResponse.json({ orders });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
