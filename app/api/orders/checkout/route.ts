import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderRequest, CreateOrderResponse } from '@shared/api';

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

    // Create new order (mock implementation - in real app, save to database)
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

    // Create KDS tickets for each order item (based on station routing)
    const kdsTickets = newOrderItems.map((item, index) => ({
      id: `ticket-${Date.now()}-${index}`,
      order_item_id: item.id,
      station_id: 'station-1', // Default station - in real app, determine from recipe routing
      sequence: 1,
      status: 'queued' as const,
      priority_score: 0.5,
      sla_minutes: 20, // Default SLA
      enqueued_at: new Date().toISOString()
    }));

    const response: CreateOrderResponse = {
      order: newOrder,
      order_items: newOrderItems
    };

    // Log the order creation (in real app, this would be saved to database)
    console.log('Order created:', {
      order: newOrder,
      order_items: newOrderItems,
      kds_tickets: kdsTickets
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
