import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderRequest, CreateOrderResponse, GetOrdersResponse } from '@shared/api';

// Mock data for now - replace with actual database queries
const mockOrders: (GetOrdersResponse['orders'][0])[] = [
  {
    id: '1',
    location_id: 'loc-1',
    source: 'dine_in',
    table_number: '12',
    customer_name: 'Johnson',
    placed_at: '2024-01-15T14:04:00Z',
    promised_at: '2024-01-15T14:30:00Z',
    status: 'in_progress',
    order_items: [
      {
        id: '1-1',
        order_id: '1',
        menu_item_id: '1',
        qty: 1,
        notes: 'Medium rare',
        status: 'prepping',
        predicted_prep_minutes: 15,
        created_at: '2024-01-15T14:04:00Z',
        started_at: '2024-01-15T14:05:00Z',
        menu_item: {
          id: '1',
          org_id: 'org-1',
          name: 'Grilled Salmon',
          category: 'Main',
          is_active: true,
          avg_prep_minutes: 15,
          created_at: '2024-01-01T00:00:00Z'
        },
        kds_tickets: [
          {
            id: 'ticket-1-1',
            order_item_id: '1-1',
            station_id: 'station-1',
            sequence: 1,
            status: 'prepping',
            priority_score: 0.8,
            sla_minutes: 20,
            enqueued_at: '2024-01-15T14:04:00Z',
            started_at: '2024-01-15T14:05:00Z'
          }
        ]
      }
    ]
  },
  {
    id: '2',
    location_id: 'loc-1',
    source: 'dine_in',
    table_number: '3',
    customer_name: 'Wilson',
    placed_at: '2024-01-15T13:04:00Z',
    status: 'in_progress',
    order_items: [
      {
        id: '2-1',
        order_id: '2',
        menu_item_id: '2',
        qty: 2,
        notes: 'No jalapeños',
        status: 'queued',
        predicted_prep_minutes: 8,
        created_at: '2024-01-15T13:04:00Z',
        menu_item: {
          id: '2',
          org_id: 'org-1',
          name: 'Fish Tacos',
          category: 'Main',
          is_active: true,
          avg_prep_minutes: 8,
          created_at: '2024-01-01T00:00:00Z'
        },
        kds_tickets: [
          {
            id: 'ticket-2-1',
            order_item_id: '2-1',
            station_id: 'station-1',
            sequence: 1,
            status: 'queued',
            priority_score: 0.6,
            sla_minutes: 15,
            enqueued_at: '2024-01-15T13:04:00Z'
          }
        ]
      }
    ]
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const location_id = searchParams.get('location_id');

    let filteredOrders = mockOrders;

    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status);
    }

    if (location_id) {
      filteredOrders = filteredOrders.filter(order => order.location_id === location_id);
    }

    const response: GetOrdersResponse = {
      orders: filteredOrders
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    // Validate required fields
    if (!body.location_id || !body.source || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new order (mock implementation)
    const newOrder = {
      id: `order-${Date.now()}`,
      location_id: body.location_id,
      source: body.source,
      table_number: body.table_number,
      customer_name: body.customer_name,
      placed_at: new Date().toISOString(),
      status: 'open' as const
    };

    const newOrderItems = body.items.map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      order_id: newOrder.id,
      menu_item_id: item.menu_item_id,
      qty: item.qty,
      notes: item.notes,
      status: 'queued' as const,
      created_at: new Date().toISOString()
    }));

    const response: CreateOrderResponse = {
      order: newOrder,
      order_items: newOrderItems
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
