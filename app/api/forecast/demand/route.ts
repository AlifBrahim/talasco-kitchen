import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';
import { analyzeWithNovaPro, AIAnalysisRequest } from '../ai-service';

export interface DemandForecastRequest {
  location_id?: string;
  menu_item_id?: string;
  start_date: string;
  end_date: string;
  bucket_hours?: number; // Default 1 hour buckets
}

export interface DemandForecastResponse {
  forecasts: {
    menu_item_id: string;
    menu_item_name: string;
    bucket_start: string;
    bucket_end: string;
    expected_qty: number;
    confidence: number;
    factors: {
      historical_avg: number;
      trend_factor: number;
      seasonal_factor: number;
      holiday_factor: number;
      weather_factor: number;
    };
  }[];
  summary: {
    total_items: number;
    peak_hour: string;
    total_expected_orders: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: DemandForecastRequest;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      // Provide default values if JSON parsing fails
      body = {
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        bucket_hours: 1
      };
    }
    
    const {
      location_id = 'default',
      menu_item_id,
      start_date,
      end_date,
      bucket_hours = 1
    } = body;

    // Get historical order data using actual schema
    const historicalData = await dbQuery(`
      SELECT 
        oi.itemid as menu_item_id,
        mi.itemname as menu_item_name,
        mi.category,
        DATE_TRUNC('hour', o.orderdate) as hour_bucket,
        SUM(oi.quantity) as total_quantity,
        COUNT(DISTINCT o.orderid) as order_count,
        AVG(oi.quantity) as avg_quantity
      FROM orderitems oi
      JOIN orders o ON oi.orderid = o.orderid
      JOIN menuitems mi ON oi.itemid = mi.itemid
      WHERE o.status != 'cancelled'
        AND o.orderdate >= NOW() - INTERVAL '30 days'
        ${menu_item_id ? 'AND oi.itemid = $1' : ''}
      GROUP BY oi.itemid, mi.itemname, mi.category, hour_bucket
      ORDER BY hour_bucket DESC, total_quantity DESC
    `, menu_item_id ? [menu_item_id] : []);

    // Get menu items for forecasting using actual schema
    const menuItems = await dbQuery(`
      SELECT 
        itemid as id, 
        itemname as name, 
        category, 
        prep_time_minutes as avg_prep_minutes,
        price
      FROM menuitems
      WHERE is_active = true
      ${menu_item_id ? 'AND itemid = $1' : ''}
    `, menu_item_id ? [menu_item_id] : []);

    // Use AI-powered analysis instead of hardcoded patterns
    const aiRequest: AIAnalysisRequest = {
      historicalData: historicalData.rows.map(row => ({
        menu_item_id: row.menu_item_id,
        menu_item_name: row.menu_item_name,
        category: row.category,
        date: row.hour_bucket,
        quantity: parseInt(row.total_quantity),
        order_count: parseInt(row.order_count)
      })),
      menuItems: menuItems.rows,
      timeContext: {
        startDate: start_date,
        endDate: end_date,
        timeOfDay: new Date(start_date).getHours() < 12 ? 'morning' : 
                   new Date(start_date).getHours() < 17 ? 'afternoon' : 'evening',
        dayOfWeek: new Date(start_date).toLocaleDateString('en-US', { weekday: 'long' })
      },
      analysisType: 'demand_forecast'
    };

    // Get AI analysis
    const aiAnalysis = await analyzeWithNovaPro(aiRequest);
    
    // Convert AI predictions to forecast format
    const forecasts = aiAnalysis.predictions.map(prediction => {
      const menuItem = menuItems.rows.find(item => Number(item.id) === Number(prediction.menu_item_id));
      return {
        menu_item_id: prediction.menu_item_id,
        menu_item_name: menuItem?.name || prediction.menu_item_name,
        bucket_start: start_date,
        bucket_end: end_date,
        expected_qty: prediction.expected_quantity,
        confidence: prediction.confidence,
        factors: {
          historical_avg: prediction.factors.historical_trend,
          trend_factor: prediction.factors.historical_trend,
          seasonal_factor: prediction.factors.seasonal_impact,
          holiday_factor: prediction.factors.external_factors,
          weather_factor: prediction.factors.external_factors
        }
      };
    });

    // Calculate summary statistics using AI insights
    const totalExpectedOrders = forecasts.reduce((sum, f) => sum + f.expected_qty, 0);
    const peakHour = aiAnalysis.insights.peak_hours[0] || '12:00';

    const response: DemandForecastResponse = {
      forecasts,
      summary: {
        total_items: menuItems.rows.length,
        peak_hour: peakHour,
        total_expected_orders: Math.round(totalExpectedOrders)
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating demand forecast:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to generate demand forecast', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Old hardcoded functions removed - now using AI-powered analysis
