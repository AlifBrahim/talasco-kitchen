/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

// =========
// Core Entity Types (matching database schema)
// =========

export interface Org {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Location {
  id: string;
  org_id: string;
  name: string;
  address?: string;
  opens_at?: string;
  closes_at?: string;
  created_at: string;
}

export interface User {
  id: string;
  org_id: string;
  full_name: string;
  email?: string;
  role: 'admin' | 'manager' | 'kitchen' | 'foh' | 'analyst';
  created_at: string;
}

export interface Station {
  id: string;
  location_id: string;
  name: string;
  kind: 'prep' | 'cook' | 'expedite' | 'bar' | 'dessert';
  is_active: boolean;
}

export interface StationSLA {
  id: string;
  station_id: string;
  daypart: string;
  target_prep_minutes: number;
  alert_after_minutes: number;
}

export interface MenuItem {
  id: string;
  org_id: string;
  sku?: string;
  name: string;
  category?: string;
  is_active: boolean;
  avg_prep_minutes?: number;
  created_at: string;
  price?: number;        // if you also store price
  image_path?: string;   // NEW: public path like '/menu/burger.png'
}

export interface Ingredient {
  id: string;
  org_id: string;
  sku?: string;
  name: string;
  unit: string;
  shelf_life_hours?: number;
  is_active: boolean;
}

export interface Recipe {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  qty: number;
  unit: string;
}

export interface Order {
  id: string;
  location_id: string;
  source: 'dine_in' | 'qr' | 'kiosk' | 'phone' | 'delivery' | 'pickup' | 'pos';
  table_number?: string;
  customer_name?: string;
  placed_at: string;
  started_at?: string;
  completed_at?: string;
  promised_at?: string;
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'cancelled' | 'completed';
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  notes?: string;
  status: 'queued' | 'firing' | 'prepping' | 'passed' | 'served' | 'cancelled' | 'completed';
  predicted_prep_minutes?: number;
  actual_prep_seconds?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface KDSTicket {
  id: string;
  order_item_id: string;
  station_id: string;
  sequence: number;
  status: 'queued' | 'firing' | 'prepping' | 'ready' | 'passed' | 'cancelled';
  priority_score?: number;
  priority_reason?: any;
  sla_minutes?: number;
  enqueued_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface InventoryLevel {
  id: string;
  location_id: string;
  ingredient_id: string;
  on_hand: number;
  unit: string;
  par_level?: number;
  reorder_point?: number;
  safety_stock?: number;
}

// =========
// API Request/Response Types
// =========

export interface CreateOrderRequest {
  location_id: string;
  source: Order['source'];
  table_number?: string;
  customer_name?: string;
  items: {
    menu_item_id: string;
    qty: number;
    notes?: string;
  }[];
}

export interface CreateOrderResponse {
  order: Order;
  order_items: OrderItem[];
}

export interface GetOrdersResponse {
  orders: (Order & {
    order_items: (OrderItem & {
      menu_item: MenuItem;
      kds_tickets: KDSTicket[];
    })[];
  })[];
}

export interface GetMenuItemsResponse {
  menu_items: MenuItem[];
}

export interface GetStationsResponse {
  stations: (Station & {
    station_sla: StationSLA[];
  })[];
}

export interface UpdateOrderItemStatusRequest {
  order_item_id: string;
  status: OrderItem['status'];
  station_id?: string;
}

export interface UpdateOrderItemStatusResponse {
  success: boolean;
  order_item?: OrderItem;
  orderItem?: OrderItem;
  message?: string;
}

// =========
// Legacy/Example Types
// =========

export interface DemoResponse {
  message: string;
}

export interface KSMInventoryItem {
  id: string;
  name: string;
  category?: string | null;
  quantity: number;
  unit: string;
  low: number;
  updated: string;
}

export interface GetKSMInventoryResponse {
  items: KSMInventoryItem[];
}

// =========
// Inventory Management Types
// =========

export interface MenuItemAvailability {
  itemid: number;
  itemname: string;
  sku: string;
  available: boolean;
  missingIngredients: string[];
  stockStatus: 'available' | 'low_stock' | 'out_of_stock';
}

export interface GetMenuAvailabilityResponse {
  items: MenuItemAvailability[];
}

export interface UpdateOrderStatusRequest {
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'completed' | 'cancelled';
}

// =========
// Forecasting Types
// =========

export interface DemandForecastRequest {
  location_id?: string;
  menu_item_id?: string;
  start_date: string;
  end_date: string;
  bucket_hours?: number;
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

export interface PrepPlanRequest {
  location_id?: string;
  target_date: string;
  time_window_hours?: number;
  prep_lead_time_hours?: number;
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

export interface TrendAnalysisRequest {
  location_id?: string;
  menu_item_id?: string;
  period_days?: number;
  granularity?: 'hour' | 'day' | 'week';
}

export interface TrendAnalysisResponse {
  trends: {
    menu_item_id: string;
    menu_item_name: string;
    category: string;
    trend_direction: 'increasing' | 'decreasing' | 'stable';
    trend_strength: number;
    growth_rate: number;
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