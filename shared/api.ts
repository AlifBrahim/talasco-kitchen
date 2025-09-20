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
  promised_at?: string;
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'cancelled';
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  qty: number;
  notes?: string;
  status: 'queued' | 'firing' | 'prepping' | 'passed' | 'served' | 'cancelled';
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
  order_item: OrderItem;
}

// =========
// Legacy/Example Types
// =========

export interface DemoResponse {
  message: string;
}
