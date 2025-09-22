import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type RevenueByDayRow = {
  day: string;
  revenue: string | number;
  orders: string | number;
};

type TopItemRow = {
  itemname: string;
  revenue: string | number;
  qty: string | number;
};

type StatusCountRow = {
  status: string;
  count: string | number;
};

export async function GET(_req: NextRequest) {
  try {
    // Revenue trend by day (last 30 days)
    const revenueByDay = await dbQuery<RevenueByDayRow>(
      `
      SELECT
        DATE(o.orderdate) AS day,
        COALESCE(SUM(oi.quantity * mi.price), 0) AS revenue,
        COUNT(DISTINCT o.orderid) AS orders
      FROM orders o
      LEFT JOIN orderitems oi ON oi.orderid = o.orderid
      LEFT JOIN menuitems mi ON mi.itemid = oi.itemid
      WHERE o.orderdate >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(o.orderdate)
      ORDER BY day
      `
    );

    // Top items by revenue (last 30 days)
    const topItems = await dbQuery<TopItemRow>(
      `
      SELECT
        mi.itemname,
        COALESCE(SUM(oi.quantity * mi.price), 0) AS revenue,
        COALESCE(SUM(oi.quantity), 0) AS qty
      FROM orderitems oi
      JOIN orders o ON o.orderid = oi.orderid
      JOIN menuitems mi ON mi.itemid = oi.itemid
      WHERE o.orderdate >= NOW() - INTERVAL '30 days'
      GROUP BY mi.itemname
      ORDER BY revenue DESC
      LIMIT 7
      `
    );

    // Orders by status (last 30 days)
    const statusCounts = await dbQuery<StatusCountRow>(
      `
      SELECT o.status, COUNT(*)::int AS count
      FROM orders o
      WHERE o.orderdate >= NOW() - INTERVAL '30 days'
      GROUP BY o.status
      `
    );

    // Totals
    const totals = await dbQuery<{ revenue: string | number; avg_order_value: string | number; orders: string | number }>(
      `
      SELECT 
        COALESCE(SUM(oi.quantity * mi.price), 0) AS revenue,
        CASE WHEN COUNT(DISTINCT o.orderid) > 0 
          THEN COALESCE(SUM(oi.quantity * mi.price), 0) / COUNT(DISTINCT o.orderid)
          ELSE 0 END AS avg_order_value,
        COUNT(DISTINCT o.orderid) AS orders
      FROM orders o
      LEFT JOIN orderitems oi ON oi.orderid = o.orderid
      LEFT JOIN menuitems mi ON mi.itemid = oi.itemid
      WHERE o.orderdate >= NOW() - INTERVAL '30 days'
      `
    );

    const response = {
      rangeDays: 30,
      revenueByDay: revenueByDay.rows.map(r => ({
        day: r.day,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
      topItems: topItems.rows.map(r => ({
        name: r.itemname,
        revenue: Number(r.revenue),
        qty: Number(r.qty),
      })),
      statusCounts: statusCounts.rows.map(r => ({ status: r.status, count: Number(r.count) })),
      totals: totals.rows[0]
        ? {
            totalRevenue: Number(totals.rows[0].revenue),
            averageOrderValue: Number(totals.rows[0].avg_order_value),
            orders: Number(totals.rows[0].orders),
          }
        : { totalRevenue: 0, averageOrderValue: 0, orders: 0 },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error('Error generating financial report:', err);
    return NextResponse.json({ error: 'Failed to generate financial report' }, { status: 500 });
  }
}


