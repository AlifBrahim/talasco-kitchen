import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

export async function GET(request: NextRequest) {
  try {
    // Get current kitchen conditions
    const kitchenConditions = await dbQuery(`
      SELECT 
        s.sectionid,
        s.sectionname,
        s.max_capacity,
        COUNT(oi.itemid) as current_load,
        AVG(oi.prep_time_minutes) as avg_prep_time,
        COUNT(CASE WHEN oi.status = 'prepping' THEN 1 END) as active_items,
        COUNT(CASE WHEN oi.status = 'queued' THEN 1 END) as queued_items
      FROM sections s
      LEFT JOIN menuitems mi ON mi.sectionid = s.sectionid
      LEFT JOIN orderitems oi ON oi.itemid = mi.itemid 
        AND oi.status IN ('queued', 'prepping')
      LEFT JOIN orders o ON o.orderid = oi.orderid 
        AND o.status IN ('open', 'in_progress')
      GROUP BY s.sectionid, s.sectionname, s.max_capacity
      ORDER BY s.sectionid
    `);

    // Get recent completion times
    const recentCompletions = await dbQuery(`
      SELECT 
        mi.sectionid,
        AVG(EXTRACT(EPOCH FROM (oi.completed_at - oi.started_at))/60) as avg_actual_time,
        COUNT(*) as sample_size
      FROM orderitems oi
      JOIN menuitems mi ON mi.itemid = oi.itemid
      WHERE oi.completed_at IS NOT NULL 
        AND oi.started_at IS NOT NULL
        AND oi.completed_at > NOW() - INTERVAL '2 hours'
      GROUP BY mi.sectionid
    `);

    const stations = kitchenConditions.rows.map(row => ({
      sectionId: row.sectionid,
      sectionName: row.sectionname,
      maxCapacity: row.max_capacity,
      currentLoad: row.current_load,
      loadPercentage: Math.round((row.current_load / row.max_capacity) * 100),
      avgPrepTime: row.avg_prep_time || 0,
      activeItems: row.active_items,
      queuedItems: row.queued_items
    }));

    const efficiency = recentCompletions.rows.map(row => ({
      sectionId: row.sectionid,
      avgActualTime: row.avg_actual_time,
      sampleSize: row.sample_size
    }));

    return NextResponse.json({
      stations,
      efficiency,
      timestamp: new Date().toISOString(),
      summary: {
        totalStations: stations.length,
        totalLoad: stations.reduce((sum, s) => sum + s.currentLoad, 0),
        avgLoadPercentage: Math.round(stations.reduce((sum, s) => sum + s.loadPercentage, 0) / stations.length)
      }
    });

  } catch (error) {
    console.error('Kitchen status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen status' },
      { status: 500 }
    );
  }
}
