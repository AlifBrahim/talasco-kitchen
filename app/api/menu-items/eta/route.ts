import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type ETARequest = {
  itemIds: string[];
};

type ETAItem = {
  itemId: string;
  itemName: string;
  basePrepTime: number;
  estimatedETA: number;
  queuePosition: number;
  stationLoad: number;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    baseTime: number;
    queueDelay: number;
    stationLoadMultiplier: number;
    slaRisk: number;
  };
};

type ETAResponse = {
  items: ETAItem[];
  lastUpdated: string;
};

export async function POST(request: NextRequest) {
  try {
    const body: ETARequest = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds array is required' },
        { status: 400 }
      );
    }

    // Get current kitchen conditions
    const kitchenConditions = await getKitchenConditions();
    
    // Calculate ETA for each item
    const etaItems: ETAItem[] = [];

    for (const itemId of itemIds) {
      const itemETA = await calculateItemETA(itemId, kitchenConditions);
      if (itemETA) {
        etaItems.push(itemETA);
      }
    }

    const response: ETAResponse = {
      items: etaItems,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('ETA calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate ETA' },
      { status: 500 }
    );
  }
}

async function getKitchenConditions() {
  // Get current queue status by station
  const queueByStation = await dbQuery(`
    SELECT 
      s.sectionid,
      s.sectionname,
      s.max_capacity,
      COUNT(oi.itemid) as current_load,
      AVG(mi.prep_time_minutes) as avg_prep_time,
      COUNT(CASE WHEN oi.status = 'prepping' THEN 1 END) as active_items,
      COUNT(CASE WHEN oi.status = 'queued' THEN 1 END) as queued_items
    FROM sections s
    LEFT JOIN menuitems mi ON mi.sectionid = s.sectionid
    LEFT JOIN orderitems oi ON oi.itemid = mi.itemid 
      AND oi.status IN ('queued', 'prepping')
    LEFT JOIN orders o ON o.orderid = oi.orderid 
      AND o.status IN ('open', 'in_progress')
    GROUP BY s.sectionid, s.sectionname, s.max_capacity
  `);

  // Get recent completion times for accuracy
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

  const stationData = new Map();
  
  // Process queue data
  for (const row of queueByStation.rows) {
    const loadPercentage = (row.current_load / row.max_capacity) * 100;
    stationData.set(row.sectionid, {
      sectionName: row.sectionname,
      maxCapacity: row.max_capacity,
      currentLoad: row.current_load,
      loadPercentage: Math.min(loadPercentage, 100),
      avgPrepTime: row.avg_prep_time || 0,
      activeItems: row.active_items,
      queuedItems: row.queued_items,
      efficiencyMultiplier: 1.0 // Default efficiency
    });
  }

  // Apply efficiency adjustments based on recent performance
  for (const row of recentCompletions.rows) {
    const station = stationData.get(row.sectionid);
    if (station && row.sample_size >= 3) {
      const expectedTime = station.avgPrepTime;
      const actualTime = row.avg_actual_time;
      if (expectedTime > 0) {
        station.efficiencyMultiplier = Math.max(0.5, Math.min(2.0, actualTime / expectedTime));
      }
    }
  }

  return {
    stations: Object.fromEntries(stationData),
    timestamp: new Date().toISOString()
  };
}

async function calculateItemETA(itemId: string, kitchenConditions: any): Promise<ETAItem | null> {
  // Get menu item details
  const itemResult = await dbQuery(`
    SELECT 
      mi.itemid,
      mi.itemname,
      mi.prep_time_minutes,
      mi.sectionid,
      s.sectionname,
      s.max_capacity
    FROM menuitems mi
    JOIN sections s ON s.sectionid = mi.sectionid
    WHERE mi.itemid = $1
  `, [itemId]);

  if (itemResult.rows.length === 0) {
    return null;
  }

  const item = itemResult.rows[0];
  const station = kitchenConditions.stations[item.sectionid.toString()];

  if (!station) {
    console.error(`Station not found for sectionId: ${item.sectionid}`);
    return null;
  }

  // Calculate base factors
  const basePrepTime = item.prep_time_minutes || 15; // Default 15 min if not set
  const queuePosition = parseInt(station.queuedItems) || 0;
  const stationLoad = parseFloat(station.loadPercentage) || 0;
  
  // Calculate delays and multipliers
  const queueDelay = calculateQueueDelay(queuePosition, station.max_capacity, basePrepTime);
  const stationLoadMultiplier = calculateStationLoadMultiplier(stationLoad);
  const slaRisk = calculateSLARisk(queuePosition, stationLoad, basePrepTime);
  
  // Apply efficiency multiplier
  const efficiencyMultiplier = station.efficiencyMultiplier || 1.0;
  
  
  // Calculate final ETA
  const estimatedETA = Math.round(
    (basePrepTime + queueDelay) * stationLoadMultiplier * efficiencyMultiplier
  );

  // Determine confidence level
  const confidence = determineConfidence(stationLoad, queuePosition, station.sample_size || 0);

  return {
    itemId: item.itemid.toString(),
    itemName: item.itemname,
    basePrepTime,
    estimatedETA,
    queuePosition,
    stationLoad,
    confidence,
    factors: {
      baseTime: basePrepTime,
      queueDelay,
      stationLoadMultiplier,
      slaRisk
    }
  };
}

function calculateQueueDelay(queuePosition: number, maxCapacity: number, basePrepTime: number): number {
  if (queuePosition === 0) return 0;
  
  if (!maxCapacity || maxCapacity <= 0) {
    return queuePosition * basePrepTime; // Fallback: linear delay
  }
  
  // Estimate time based on queue position and station capacity
  const batchesAhead = Math.ceil(queuePosition / maxCapacity);
  return batchesAhead * basePrepTime * 0.8; // Assume 80% efficiency in batching
}

function calculateStationLoadMultiplier(loadPercentage: number): number {
  if (loadPercentage < 50) return 1.0; // No delay
  if (loadPercentage < 75) return 1.2; // 20% delay
  if (loadPercentage < 90) return 1.5; // 50% delay
  return 2.0; // 100% delay for overloaded stations
}

function calculateSLARisk(queuePosition: number, stationLoad: number, basePrepTime: number): number {
  // Higher risk for longer queues and higher loads
  const queueRisk = Math.min(queuePosition * 0.1, 2.0);
  const loadRisk = Math.min(stationLoad / 100, 1.0);
  return (queueRisk + loadRisk) / 2;
}

function determineConfidence(stationLoad: number, queuePosition: number, sampleSize: number): 'high' | 'medium' | 'low' {
  if (sampleSize >= 10 && stationLoad < 80 && queuePosition < 5) {
    return 'high';
  }
  if (sampleSize >= 5 && stationLoad < 95 && queuePosition < 10) {
    return 'medium';
  }
  return 'low';
}
