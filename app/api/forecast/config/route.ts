import { NextRequest, NextResponse } from 'next/server';

export interface ForecastConfig {
  safety_buffer: number; // Default 1.2 (20% buffer)
  min_demand_threshold: number; // Default 0.5
  trend_threshold: number; // Default 0.1
  confidence_base: number; // Default 0.3
  confidence_increment: number; // Default 0.1
  seasonal_factors: {
    [category: string]: number[];
  };
  holiday_factors: {
    [holiday: string]: number;
  };
  weather_integration: boolean;
  external_ai_service?: string;
}

const DEFAULT_CONFIG: ForecastConfig = {
  safety_buffer: 1.2,
  min_demand_threshold: 0.5,
  trend_threshold: 0.1,
  confidence_base: 0.3,
  confidence_increment: 0.1,
  seasonal_factors: {
    'Food': [0.9, 0.8, 1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8, 0.9],
    'Drink': [0.7, 0.8, 1.0, 1.2, 1.4, 1.5, 1.4, 1.2, 1.0, 0.8, 0.7, 0.6],
    'Dessert': [1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.2, 1.3]
  },
  holiday_factors: {
    'Christmas': 1.5,
    'New Year': 1.3,
    'July 4th': 1.4,
    'Thanksgiving': 1.2,
    'Weekend': 1.2
  },
  weather_integration: false
};

// In-memory config storage (in production, use database)
let currentConfig: ForecastConfig = DEFAULT_CONFIG;

export async function GET() {
  return NextResponse.json({ config: currentConfig });
}

export async function POST(request: NextRequest) {
  try {
    const updates: Partial<ForecastConfig> = await request.json();
    
    // Validate and update config
    currentConfig = { ...currentConfig, ...updates };
    
    return NextResponse.json({ 
      success: true, 
      config: currentConfig,
      message: 'Configuration updated successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}
