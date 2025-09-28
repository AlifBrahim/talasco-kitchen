import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';
import { analyzeWithNovaPro, AIAnalysisRequest } from '../ai-service';

export interface TrendAnalysisRequest {
  location_id?: string;
  menu_item_id?: string;
  period_days?: number; // Default 30 days
  granularity?: 'hour' | 'day' | 'week'; // Default 'day'
}

export interface TrendAnalysisResponse {
  trends: {
    menu_item_id: string;
    menu_item_name: string;
    category: string;
    trend_direction: 'increasing' | 'decreasing' | 'stable';
    trend_strength: number; // -1 to 1
    growth_rate: number; // percentage
    peak_hours: string[];
    peak_days: string[];
    seasonal_pattern: {
      month: number;
      factor: number;
    }[];
    recommendations: string[];
  }[];
  summary: {
    total_items_analyzed: number;
    trending_up: number;
    trending_down: number;
    stable: number;
    avg_growth_rate: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: TrendAnalysisRequest;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      // Provide default values if JSON parsing fails
      body = {
        period_days: 30,
        granularity: 'day'
      };
    }
    
    const {
      location_id = 'default',
      menu_item_id,
      period_days = 30,
      granularity = 'day'
    } = body;

    // Get historical order data using actual schema
    const historicalData = await dbQuery(`
      SELECT 
        oi.itemid as menu_item_id,
        mi.itemname as menu_item_name,
        mi.category,
        DATE_TRUNC($1, o.orderdate) as time_bucket,
        COUNT(DISTINCT o.orderid) as order_count,
        SUM(oi.quantity) as total_quantity,
        AVG(oi.quantity) as avg_quantity_per_order
      FROM orderitems oi
      JOIN orders o ON oi.orderid = o.orderid
      JOIN menuitems mi ON oi.itemid = mi.itemid
      WHERE o.status != 'cancelled'
        AND o.orderdate >= NOW() - INTERVAL '${period_days} days'
        ${menu_item_id ? 'AND oi.itemid = $2' : ''}
      GROUP BY oi.itemid, mi.itemname, mi.category, time_bucket
      ORDER BY time_bucket DESC, order_count DESC
    `, [granularity, ...(menu_item_id ? [menu_item_id] : [])]);

    // Get unique menu items using actual schema
    const menuItems = await dbQuery(`
      SELECT DISTINCT 
        itemid as id, 
        itemname as name, 
        category
      FROM menuitems
      WHERE is_active = true
      ${menu_item_id ? 'AND itemid = $1' : ''}
    `, menu_item_id ? [menu_item_id] : []);

    // Use AI-powered trend analysis
    const aiRequest: AIAnalysisRequest = {
      historicalData: historicalData.rows.map(row => ({
        menu_item_id: row.menu_item_id,
        menu_item_name: row.menu_item_name,
        category: row.category,
        date: row.time_bucket,
        quantity: parseInt(row.total_quantity),
        order_count: parseInt(row.order_count)
      })),
      menuItems: menuItems.rows,
      timeContext: {
        startDate: new Date(Date.now() - period_days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      },
      analysisType: 'trend_analysis'
    };

    // Get AI analysis
    const aiAnalysis = await analyzeWithNovaPro(aiRequest);
    
    // Convert AI analysis to trend format
    const trends = aiAnalysis.insights.trend_directions.map(trend => {
      const menuItem = menuItems.rows.find(item => Number(item.id) === Number(trend.menu_item_id));
      return {
        menu_item_id: trend.menu_item_id,
        menu_item_name: menuItem?.name || 'Unknown',
        category: menuItem?.category || 'Unknown',
        trend_direction: trend.direction,
        trend_strength: trend.strength,
        growth_rate: trend.direction === 'increasing' ? trend.strength * 100 : 
                    trend.direction === 'decreasing' ? -trend.strength * 100 : 0,
        peak_hours: aiAnalysis.insights.peak_hours,
        peak_days: [], // Will be populated from AI insights
        seasonal_pattern: aiAnalysis.insights.seasonal_patterns,
        recommendations: [trend.reasoning]
      };
    });

    // Calculate summary statistics
    const totalGrowthRate = trends.reduce((sum, trend) => sum + trend.growth_rate, 0) / trends.length;
    const trendingUp = trends.filter(t => t.trend_direction === 'increasing').length;
    const trendingDown = trends.filter(t => t.trend_direction === 'decreasing').length;
    const stable = trends.filter(t => t.trend_direction === 'stable').length;

    const response: TrendAnalysisResponse = {
      trends,
      summary: {
        total_items_analyzed: trends.length,
        trending_up: trendingUp,
        trending_down: trendingDown,
        stable: stable,
        avg_growth_rate: trends.length > 0 ? Math.round(totalGrowthRate / trends.length * 100) / 100 : 0
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error analyzing trends:', error);
    return NextResponse.json(
      { error: 'Failed to analyze trends' },
      { status: 500 }
    );
  }
}

// Old hardcoded trend analysis functions removed - now using AI-powered analysis
