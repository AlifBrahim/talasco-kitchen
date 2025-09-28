# AI Forecasting Features

## Overview

The Talasco Kitchen system now includes comprehensive AI-powered forecasting capabilities designed to help chefs and managers predict food demand and optimize pre-preparation. These features enable proactive kitchen management by analyzing historical data, trends, seasonal patterns, and external factors to provide accurate demand predictions and prep recommendations.

## Features

### 1. Demand Forecasting (`/api/forecast/demand`)

**Purpose**: Predict expected order quantities for specific time periods and menu items.

**Key Capabilities**:
- Historical data analysis with configurable time buckets (1-8 hours)
- Trend analysis comparing recent vs. older data
- Seasonal pattern recognition based on month and category
- Holiday factor adjustments for major holidays and weekends
- Weather factor integration (placeholder for future enhancement)
- Confidence scoring based on data availability

**Input Parameters**:
- `location_id`: Restaurant location (default: 'default')
- `menu_item_id`: Specific menu item (optional)
- `start_date`: Forecast start date
- `end_date`: Forecast end date
- `bucket_hours`: Time granularity (1, 2, 4, or 8 hours)

**Output**:
- Expected quantities per time bucket
- Confidence levels for each prediction
- Factor breakdown (historical, trend, seasonal, holiday, weather)
- Summary statistics (total items, peak hour, expected orders)

### 2. Prep Planning (`/api/forecast/prep-plan`)

**Purpose**: Generate detailed preparation recommendations with timing and cost analysis.

**Key Capabilities**:
- Demand-based quantity recommendations with safety buffers
- Prep timing optimization based on actual prep times
- Cost estimation using ingredient costs and recipes
- Waste risk assessment based on perishability and over-prep ratios
- Integration with inventory levels and ingredient availability
- Rationale generation explaining recommendations

**Input Parameters**:
- `location_id`: Restaurant location
- `target_date`: Date for prep planning
- `time_window_hours`: Service window duration (4-12 hours)
- `prep_lead_time_hours`: How far ahead to start prep (1-4 hours)

**Output**:
- Detailed prep recommendations per menu item
- Start times and duration estimates
- Cost estimates and waste risk assessments
- Summary statistics (total items, prep time, cost, waste risk)

### 3. Trend Analysis (`/api/forecast/trends`)

**Purpose**: Analyze historical patterns and identify trends in menu item popularity.

**Key Capabilities**:
- Linear regression analysis for trend detection
- Growth rate calculations
- Peak hour and day identification
- Seasonal pattern analysis
- Actionable recommendations based on trends

**Input Parameters**:
- `location_id`: Restaurant location
- `menu_item_id`: Specific menu item (optional)
- `period_days`: Analysis period (7, 14, 30, or 90 days)
- `granularity`: Time granularity (hour, day, or week)

**Output**:
- Trend direction (increasing, decreasing, stable)
- Trend strength and growth rates
- Peak times and seasonal patterns
- Recommendations for each item

### 4. Historical Data Analysis (`/api/forecast/historical-data`)

**Purpose**: Provide raw historical data for analysis and visualization.

**Key Capabilities**:
- Order history with time-based aggregation
- Peak hour and day identification
- Summary statistics and date ranges
- Support for filtering by menu item

## User Interface

### Manager Dashboard Integration

The forecasting features are integrated into the existing Kitchen Manager dashboard with:

1. **Tab Navigation**: Separate "AI Forecasting" tab alongside inventory management
2. **Quick Access Button**: Direct access from inventory management header
3. **Comprehensive Dashboard**: Three main views:
   - **Demand Forecast**: Time-based demand predictions with filters
   - **Prep Planning**: Detailed prep recommendations with cost analysis
   - **Trend Analysis**: Historical pattern analysis and recommendations

### Key UI Features

- **Interactive Filters**: Date ranges, time buckets, granularity options
- **Real-time Updates**: Refresh functionality for all forecast types
- **Visual Indicators**: Confidence bars, trend arrows, risk badges
- **Summary Cards**: Key metrics and statistics
- **Detailed Tables**: Comprehensive data with sorting and filtering
- **Demo Data Seeding**: One-click demo data generation for testing

## Technical Implementation

### Database Integration

The forecasting system leverages existing database tables:
- `orders` and `order_items` for historical data
- `menu_items` for item information and prep times
- `ingredients` and `recipes` for cost calculations
- `inventory_levels` for stock availability

### API Architecture

- **RESTful Endpoints**: Clean API design with proper error handling
- **Type Safety**: Full TypeScript integration with shared interfaces
- **Validation**: Input validation and error responses
- **Performance**: Optimized queries with proper indexing

### Algorithm Details

1. **Demand Forecasting**:
   - Historical averaging with time-of-day patterns
   - Trend analysis using linear regression
   - Seasonal adjustments based on category and month
   - Holiday multipliers for special occasions
   - Confidence scoring based on data quality

2. **Prep Planning**:
   - Safety buffer calculations (20% default)
   - Prep time scaling based on quantity
   - Cost estimation using recipe data
   - Waste risk assessment using shelf life and over-prep ratios

3. **Trend Analysis**:
   - Linear regression on historical quantities
   - R-squared calculation for trend strength
   - Peak time identification using aggregation
   - Seasonal pattern detection

## Usage Examples

### 1. Generate Daily Demand Forecast

```typescript
const response = await fetch('/api/forecast/demand', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    start_date: '2024-01-15',
    end_date: '2024-01-15',
    bucket_hours: 1
  })
});
```

### 2. Create Prep Plan for Lunch Service

```typescript
const response = await fetch('/api/forecast/prep-plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    target_date: '2024-01-15',
    time_window_hours: 8,
    prep_lead_time_hours: 2
  })
});
```

### 3. Analyze Menu Trends

```typescript
const response = await fetch('/api/forecast/trends', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    period_days: 30,
    granularity: 'day'
  })
});
```

## Future Enhancements

### Planned Features

1. **Weather Integration**: Real-time weather data for demand adjustments
2. **Machine Learning**: Advanced ML models for improved accuracy
3. **External Events**: Integration with local events and promotions
4. **Multi-location**: Cross-location trend analysis
5. **Real-time Updates**: WebSocket integration for live updates
6. **Mobile App**: Dedicated mobile interface for kitchen staff

### Advanced Analytics

1. **Predictive Maintenance**: Equipment failure prediction
2. **Staff Optimization**: Labor scheduling based on demand
3. **Menu Optimization**: Item performance analysis and recommendations
4. **Waste Reduction**: Advanced waste prediction and prevention

## Getting Started

1. **Access the Dashboard**: Navigate to the Manager page and click "AI Forecasting"
2. **Seed Demo Data**: Click "Seed Demo Data" to generate sample historical data
3. **Generate Forecasts**: Use the filters to customize your analysis
4. **Review Recommendations**: Examine prep plans and trend analysis
5. **Implement Changes**: Use the insights to optimize your kitchen operations

## Best Practices

1. **Regular Updates**: Refresh forecasts daily for optimal accuracy
2. **Data Quality**: Ensure accurate order and prep time data
3. **Seasonal Adjustments**: Review and update seasonal factors regularly
4. **Staff Training**: Train kitchen staff on prep timing recommendations
5. **Performance Monitoring**: Track forecast accuracy and adjust models

## Support

For technical support or feature requests, please refer to the main project documentation or contact the development team.

---

*This forecasting system is designed to evolve with your restaurant's needs. Regular updates and improvements ensure optimal performance and accuracy.*
