import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';

export interface PrepPlanRequest {
  location_id?: string;
  target_date: string;
  time_window_hours?: number; // Default 8 hours
  prep_lead_time_hours?: number; // How far ahead to start prep
}

export interface PrepPlanResponse {
  plan_id: string;
  target_date: string;
  time_window: {
    start: string;
    end: string;
  };
  prep_recommendations: {
    menu_item_id: string;
    menu_item_name: string;
    category: string;
    recommended_qty: number;
    prep_start_time: string;
    prep_duration_minutes: number;
    confidence: number;
    rationale: string;
    cost_estimate: number;
    waste_risk: 'low' | 'medium' | 'high';
  }[];
  summary: {
    total_items: number;
    total_prep_time_hours: number;
    estimated_cost: number;
    waste_risk_score: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: PrepPlanRequest;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      // Provide default values if JSON parsing fails
      body = {
        target_date: new Date().toISOString(),
        time_window_hours: 8,
        prep_lead_time_hours: 2
      };
    }
    
    const {
      location_id = 'default',
      target_date,
      time_window_hours = 8,
      prep_lead_time_hours = 2
    } = body;

    const targetDate = new Date(target_date);
    const timeWindowStart = new Date(targetDate);
    timeWindowStart.setHours(11, 0, 0, 0); // Default to 11 AM start
    const timeWindowEnd = new Date(timeWindowStart);
    timeWindowEnd.setHours(timeWindowStart.getHours() + time_window_hours);

    const prepStartTime = new Date(timeWindowStart);
    prepStartTime.setHours(prepStartTime.getHours() - prep_lead_time_hours);

    // Get demand forecast for the target period
    const demandResponse = await fetch(`${request.nextUrl.origin}/api/forecast/demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location_id,
        start_date: timeWindowStart.toISOString(),
        end_date: timeWindowEnd.toISOString(),
        bucket_hours: 1
      })
    });

    if (!demandResponse.ok) {
      throw new Error('Failed to get demand forecast');
    }

    const demandData = await demandResponse.json();

    // Get menu items using actual schema
    const menuItems = await dbQuery(`
      SELECT 
        itemid as id,
        itemname as name,
        category,
        prep_time_minutes as avg_prep_minutes,
        prep_time_minutes as actual_prep_minutes
      FROM menuitems
      WHERE is_active = true
    `);

    // Get ingredients using actual schema
    const ingredients = await dbQuery(`
      SELECT 
        ingredientid as id,
        ingredientname as name,
        unit,
        stockquantity,
        "Category"
      FROM ingredients
    `);

    // Since recipes table doesn't exist in Schema.md, we'll use mock data for cost calculation
    const mockRecipes = [];

    // Generate prep recommendations
    const prepRecommendations = [];
    let totalPrepTime = 0;
    let totalCost = 0;
    let wasteRiskScore = 0;

    for (const item of menuItems.rows) {
      const itemForecasts = demandData.forecasts.filter(f => f.menu_item_id === item.id);
      const totalExpectedQty = itemForecasts.reduce((sum, f) => sum + f.expected_qty, 0);
      
      if (totalExpectedQty < 0.5) continue; // Skip items with very low demand

      const recommendation = await generatePrepRecommendation(
        item,
        totalExpectedQty,
        prepStartTime,
        mockRecipes,
        ingredients.rows
      );

      prepRecommendations.push(recommendation);
      totalPrepTime += recommendation.prep_duration_minutes;
      totalCost += recommendation.cost_estimate;
      wasteRiskScore += getWasteRiskScore(recommendation);
    }

    // Sort by prep start time
    prepRecommendations.sort((a, b) => 
      new Date(a.prep_start_time).getTime() - new Date(b.prep_start_time).getTime()
    );

    // Generate a unique plan ID (not persisted to database)
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response: PrepPlanResponse = {
      plan_id: planId,
      target_date: targetDate.toISOString(),
      time_window: {
        start: timeWindowStart.toISOString(),
        end: timeWindowEnd.toISOString()
      },
      prep_recommendations: prepRecommendations,
      summary: {
        total_items: prepRecommendations.length,
        total_prep_time_hours: Math.round(totalPrepTime / 60 * 10) / 10,
        estimated_cost: Math.round(totalCost * 100) / 100,
        waste_risk_score: Math.round(wasteRiskScore / prepRecommendations.length * 100) / 100
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error generating prep plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate prep plan' },
      { status: 500 }
    );
  }
}

async function generatePrepRecommendation(
  menuItem: any,
  expectedQty: number,
  prepStartTime: Date,
  recipes: any[],
  ingredients: any[]
) {
  const actualPrepMinutes = menuItem.actual_prep_minutes || menuItem.avg_prep_minutes;
  
  // Calculate recommended quantity with safety buffer
  const safetyBuffer = 1.2; // 20% buffer
  const recommendedQty = Math.ceil(expectedQty * safetyBuffer);
  
  // Calculate prep duration (scales with quantity)
  const basePrepTime = actualPrepMinutes;
  const quantityMultiplier = Math.min(2, 1 + (recommendedQty - 1) * 0.1); // Diminishing returns
  const prepDurationMinutes = Math.ceil(basePrepTime * quantityMultiplier);
  
  // Simplified cost estimate based on menu item category
  let costEstimate = 0;
  const hasAllIngredients = true; // Assume ingredients are available
  
  switch (menuItem.category) {
    case 'Food':
      costEstimate = recommendedQty * 3.50; // Average food cost
      break;
    case 'Drink':
      costEstimate = recommendedQty * 1.50; // Average drink cost
      break;
    case 'Dessert':
      costEstimate = recommendedQty * 2.50; // Average dessert cost
      break;
    default:
      costEstimate = recommendedQty * 2.00; // Default cost
  }
  
  // Generate rationale
  const rationale = generateRationale(menuItem, expectedQty, recommendedQty, hasAllIngredients);
  
  // Calculate confidence based on data quality
  const confidence = Math.min(0.95, 0.6 + (expectedQty > 5 ? 0.2 : 0) + (hasAllIngredients ? 0.15 : 0));
  
  // Calculate waste risk based on category and quantity
  const wasteRisk = calculateWasteRisk(menuItem, recommendedQty, expectedQty, []);
  
  return {
    menu_item_id: menuItem.id,
    menu_item_name: menuItem.name,
    category: menuItem.category,
    recommended_qty: recommendedQty,
    prep_start_time: prepStartTime.toISOString(),
    prep_duration_minutes: prepDurationMinutes,
    confidence: Math.round(confidence * 100) / 100,
    rationale,
    cost_estimate: Math.round(costEstimate * 100) / 100,
    waste_risk: wasteRisk
  };
}

function generateRationale(menuItem: any, expectedQty: number, recommendedQty: number, hasAllIngredients: boolean): string {
  const reasons = [];
  
  if (expectedQty > 10) {
    reasons.push('High demand expected');
  } else if (expectedQty > 5) {
    reasons.push('Moderate demand expected');
  } else {
    reasons.push('Low demand expected');
  }
  
  if (recommendedQty > expectedQty) {
    reasons.push(`${Math.round(((recommendedQty / expectedQty) - 1) * 100)}% safety buffer`);
  }
  
  if (!hasAllIngredients) {
    reasons.push('Some ingredients may need restocking');
  }
  
  if (menuItem.category === 'Food') {
    reasons.push('Food items benefit from pre-preparation');
  }
  
  return reasons.join(', ');
}

function calculateWasteRisk(menuItem: any, recommendedQty: number, expectedQty: number, recipes: any[]): 'low' | 'medium' | 'high' {
  const overPrepRatio = recommendedQty / expectedQty;
  
  // Check for perishable ingredients
  const hasPerishableIngredients = recipes.some(r => r.shelf_life_hours && r.shelf_life_hours < 24);
  
  if (overPrepRatio > 1.5 && hasPerishableIngredients) {
    return 'high';
  } else if (overPrepRatio > 1.3 || hasPerishableIngredients) {
    return 'medium';
  } else {
    return 'low';
  }
}

function getWasteRiskScore(recommendation: any): number {
  const riskScores = { low: 1, medium: 2, high: 3 };
  return riskScores[recommendation.waste_risk] || 1;
}
