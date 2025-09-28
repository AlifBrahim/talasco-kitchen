import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface AIAnalysisRequest {
  historicalData: any[];
  menuItems: any[];
  timeContext: {
    startDate: string;
    endDate: string;
    timeOfDay?: string;
    dayOfWeek?: string;
  };
  analysisType: 'demand_forecast' | 'trend_analysis' | 'seasonal_patterns';
}

export interface AIAnalysisResponse {
  predictions: {
    menu_item_id: string;
    menu_item_name: string;
    expected_quantity: number;
    confidence: number;
    factors: {
      historical_trend: number;
      seasonal_impact: number;
      time_pattern: number;
      external_factors: number;
    };
    reasoning: string;
  }[];
  insights: {
    peak_hours: string[];
    seasonal_patterns: {
      month: number;
      factor: number;
      reasoning: string;
    }[];
    trend_directions: {
      menu_item_id: string;
      direction: 'increasing' | 'decreasing' | 'stable';
      strength: number;
      reasoning: string;
    }[];
  };
  recommendations: string[];
}

export async function analyzeWithNovaPro(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
  try {
    // Prepare context for Nova Pro
    const context = buildAnalysisContext(request);
    
    // Create the prompt for Nova Pro
    const prompt = buildNovaProPrompt(request, context);
    
    // Call Amazon Nova Pro with correct format
    const command = new InvokeModelCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'amazon.nova-pro-v1:0',
      contentType: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              }
            ]
          }
        ],
        inferenceConfig: {
          maxTokens: 4000,
          temperature: 0.3, // Lower temperature for more consistent business predictions
          topP: 0.9
        }
      })
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    // Parse Nova Pro's response
    return parseNovaProResponse(responseBody, request);
    
  } catch (error) {
    console.error('Error calling Amazon Nova Pro:', error);
    throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function buildAnalysisContext(request: AIAnalysisRequest): string {
  const { historicalData, menuItems, timeContext } = request;
  
  // Analyze historical patterns
  const totalOrders = historicalData.reduce((sum, order) => sum + order.quantity, 0);
  const avgOrdersPerDay = totalOrders / 30; // Assuming 30 days of data
  
  // Find peak hours
  const hourCounts: { [hour: number]: number } = {};
  historicalData.forEach(order => {
    const hour = new Date(order.date).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + order.quantity;
  });
  
  const peakHours = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00`);
  
  // Find popular items
  const itemCounts: { [itemId: string]: { name: string; count: number } } = {};
  historicalData.forEach(order => {
    if (!itemCounts[order.menu_item_id]) {
      itemCounts[order.menu_item_id] = { 
        name: order.menu_item_name, 
        count: 0 
      };
    }
    itemCounts[order.menu_item_id].count += order.quantity;
  });
  
  const popularItems = Object.entries(itemCounts)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5)
    .map(([id, data]) => ({ id, name: data.name, count: data.count }));
  
  return `
Restaurant Analysis Context:
- Total historical orders: ${totalOrders}
- Average orders per day: ${avgOrdersPerDay.toFixed(1)}
- Peak hours: ${peakHours.join(', ')}
- Popular items: ${popularItems.map(item => `${item.name} (${item.count} orders)`).join(', ')}
- Analysis period: ${timeContext.startDate} to ${timeContext.endDate}
- Time context: ${timeContext.timeOfDay || 'All day'}, ${timeContext.dayOfWeek || 'All days'}
- Menu items available: ${menuItems.length}
  `;
}

function buildNovaProPrompt(request: AIAnalysisRequest, context: string): string {
  const { historicalData, menuItems, analysisType } = request;
  
  let specificInstructions = '';
  
  switch (analysisType) {
    case 'demand_forecast':
      specificInstructions = `
Analyze the historical restaurant order data and predict demand for the specified time period. Consider:
1. Historical patterns and trends
2. Seasonal variations (without hardcoded assumptions)
3. Time-of-day patterns
4. Day-of-week patterns
5. Item popularity trends
6. External factors that might affect demand

For each menu item, provide:
- Expected quantity for the time period
- Confidence level (0-1)
- Factor breakdown (historical_trend, seasonal_impact, time_pattern, external_factors)
- Reasoning for the prediction
      `;
      break;
      
    case 'trend_analysis':
      specificInstructions = `
Analyze trends in the restaurant order data. Identify:
1. Items with increasing popularity
2. Items with decreasing popularity
3. Stable items
4. Peak hours and days
5. Seasonal patterns (discover them from data, don't assume)

For each trend, provide:
- Direction (increasing/decreasing/stable)
- Strength (0-1)
- Reasoning based on data analysis
      `;
      break;
      
    case 'seasonal_patterns':
      specificInstructions = `
Discover seasonal patterns from the historical data. Analyze:
1. Monthly variations in demand
2. Category-specific seasonal trends
3. Weather-related patterns (if data available)
4. Holiday impacts
5. Day-of-week patterns

Provide monthly factors and reasoning for each pattern discovered.
      `;
      break;
  }
  
  return `
You are an AI restaurant analytics expert. ${specificInstructions}

${context}

Historical Data (last 10 entries for context):
${JSON.stringify(historicalData.slice(0, 10), null, 2)}

Menu Items:
${JSON.stringify(menuItems, null, 2)}

Please provide your analysis in the following JSON format:
{
  "predictions": [
    {
      "menu_item_id": "string",
      "menu_item_name": "string", 
      "expected_quantity": number,
      "confidence": number,
      "factors": {
        "historical_trend": number,
        "seasonal_impact": number,
        "time_pattern": number,
        "external_factors": number
      },
      "reasoning": "string"
    }
  ],
  "insights": {
    "peak_hours": ["string"],
    "seasonal_patterns": [
      {
        "month": number,
        "factor": number,
        "reasoning": "string"
      }
    ],
    "trend_directions": [
      {
        "menu_item_id": "string",
        "direction": "increasing|decreasing|stable",
        "strength": number,
        "reasoning": "string"
      }
    ]
  },
  "recommendations": ["string"]
}

Focus on data-driven insights rather than assumptions. Analyze the actual patterns in the provided data.
  `;
}

function parseNovaProResponse(responseBody: any, request: AIAnalysisRequest): AIAnalysisResponse {
  try {
    // Extract the content from Nova Pro's response
    const content = responseBody.output?.message?.content?.[0]?.text || 
                   responseBody.content?.[0]?.text || 
                   responseBody.choices?.[0]?.message?.content ||
                   responseBody.output?.text ||
                   responseBody.text;
    
    if (!content) {
      console.error('No content in Nova Pro response:', responseBody);
      throw new Error('No content in Nova Pro response');
    }
    
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Nova Pro response. Content:', content);
      throw new Error('No JSON found in Nova Pro response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and structure the response
    return {
      predictions: parsed.predictions || [],
      insights: {
        peak_hours: parsed.insights?.peak_hours || [],
        seasonal_patterns: parsed.insights?.seasonal_patterns || [],
        trend_directions: parsed.insights?.trend_directions || []
      },
      recommendations: parsed.recommendations || []
    };
    
  } catch (error) {
    console.error('Error parsing Nova Pro response:', error);
    console.error('Response body:', responseBody);
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

