import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';

export interface HistoricalDataRequest {
  location_id?: string;
  menu_item_id?: string;
  days_back?: number; // Default 30 days
}

export interface HistoricalDataResponse {
  orders: {
    date: string;
    hour: number;
    menu_item_id: string;
    menu_item_name: string;
    category: string;
    quantity: number;
    total_orders: number;
  }[];
  summary: {
    total_orders: number;
    unique_items: number;
    date_range: {
      start: string;
      end: string;
    };
    peak_hours: number[];
    peak_days: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: HistoricalDataRequest = await request.json();
    const {
      location_id = 'default',
      menu_item_id,
      days_back = 30
    } = body;

    // Get historical order data
    const historicalData = await dbQuery(`
      SELECT 
        DATE(o.placed_at) as date,
        EXTRACT(HOUR FROM o.placed_at) as hour,
        oi.menu_item_id,
        mi.name as menu_item_name,
        mi.category,
        SUM(oi.qty) as quantity,
        COUNT(DISTINCT o.id) as total_orders
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.location_id = $1
        AND o.placed_at >= NOW() - INTERVAL '${days_back} days'
        AND o.status != 'cancelled'
        ${menu_item_id ? 'AND oi.menu_item_id = $2' : ''}
      GROUP BY DATE(o.placed_at), EXTRACT(HOUR FROM o.placed_at), oi.menu_item_id, mi.name, mi.category
      ORDER BY date DESC, hour DESC, quantity DESC
    `, menu_item_id ? [location_id, menu_item_id] : [location_id]);

    // Calculate summary statistics
    const orders = historicalData.rows.map(row => ({
      date: row.date,
      hour: parseInt(row.hour),
      menu_item_id: row.menu_item_id,
      menu_item_name: row.menu_item_name,
      category: row.category,
      quantity: parseInt(row.quantity),
      total_orders: parseInt(row.total_orders)
    }));

    const totalOrders = orders.reduce((sum, order) => sum + order.total_orders, 0);
    const uniqueItems = new Set(orders.map(o => o.menu_item_id)).size;
    
    // Find peak hours
    const hourCounts: { [hour: number]: number } = {};
    orders.forEach(order => {
      hourCounts[order.hour] = (hourCounts[order.hour] || 0) + order.total_orders;
    });
    const peakHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Find peak days
    const dayCounts: { [day: string]: number } = {};
    orders.forEach(order => {
      const dayName = new Date(order.date).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[dayName] = (dayCounts[dayName] || 0) + order.total_orders;
    });
    const peakDays = Object.entries(dayCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    const response: HistoricalDataResponse = {
      orders,
      summary: {
        total_orders: totalOrders,
        unique_items: uniqueItems,
        date_range: {
          start: orders.length > 0 ? orders[orders.length - 1].date : new Date().toISOString().split('T')[0],
          end: orders.length > 0 ? orders[0].date : new Date().toISOString().split('T')[0]
        },
        peak_hours: peakHours,
        peak_days: peakDays
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}
