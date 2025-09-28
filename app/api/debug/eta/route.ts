import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId parameter is required' },
        { status: 400 }
      );
    }

    // Debug: Check if item exists
    const itemCheck = await dbQuery(`
      SELECT 
        mi.itemid,
        mi.itemname,
        mi.prep_time_minutes,
        mi.sectionid,
        s.sectionname,
        s.max_capacity
      FROM menuitems mi
      LEFT JOIN sections s ON s.sectionid = mi.sectionid
      WHERE mi.itemid = $1
    `, [itemId]);

    if (itemCheck.rows.length === 0) {
      return NextResponse.json({
        error: 'Item not found',
        itemId,
        debug: 'Item does not exist in menuitems table'
      });
    }

    const item = itemCheck.rows[0];

    // Debug: Check current queue for this item
    const queueCheck = await dbQuery(`
      SELECT 
        oi.orderid,
        oi.itemid,
        oi.quantity,
        oi.status,
        oi.started_at,
        oi.completed_at,
        o.orderdate,
        o.status as order_status
      FROM orderitems oi
      JOIN orders o ON o.orderid = oi.orderid
      WHERE oi.itemid = $1
        AND oi.status IN ('queued', 'prepping')
        AND o.status IN ('open', 'in_progress')
      ORDER BY o.orderdate ASC
    `, [itemId]);

    // Debug: Check station load
    const stationLoad = await dbQuery(`
      SELECT 
        COUNT(oi.itemid) as current_load,
        COUNT(CASE WHEN oi.status = 'prepping' THEN 1 END) as active_items,
        COUNT(CASE WHEN oi.status = 'queued' THEN 1 END) as queued_items
      FROM orderitems oi
      JOIN menuitems mi ON mi.itemid = oi.itemid
      JOIN orders o ON o.orderid = oi.orderid
      WHERE mi.sectionid = $1
        AND oi.status IN ('queued', 'prepping')
        AND o.status IN ('open', 'in_progress')
    `, [item.sectionid]);

    // Debug: Check sections table
    const sectionsCheck = await dbQuery(`
      SELECT sectionid, sectionname, max_capacity
      FROM sections
      ORDER BY sectionid
    `);

    return NextResponse.json({
      item: {
        itemId: item.itemid,
        itemName: item.itemname,
        prepTimeMinutes: item.prep_time_minutes,
        sectionId: item.sectionid,
        sectionName: item.sectionname,
        maxCapacity: item.max_capacity
      },
      queue: {
        totalItems: queueCheck.rows.length,
        items: queueCheck.rows.map(row => ({
          orderId: row.orderid,
          quantity: row.quantity,
          status: row.status,
          orderDate: row.orderdate,
          orderStatus: row.order_status
        }))
      },
      stationLoad: {
        currentLoad: stationLoad.rows[0]?.current_load || 0,
        activeItems: stationLoad.rows[0]?.active_items || 0,
        queuedItems: stationLoad.rows[0]?.queued_items || 0,
        loadPercentage: item.max_capacity > 0 ? 
          Math.round(((stationLoad.rows[0]?.current_load || 0) / item.max_capacity) * 100) : 0
      },
      sections: sectionsCheck.rows.map(row => ({
        sectionId: row.sectionid,
        sectionName: row.sectionname,
        maxCapacity: row.max_capacity
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Debug ETA error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
