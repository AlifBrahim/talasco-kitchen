import { NextRequest, NextResponse } from 'next/server';
import { CreateOrderRequest } from '@shared/api';
import { createOrderInDb, OrderPayloadError } from '@api-lib/order-service';

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    if (!body.location_id || !body.source || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const response = await createOrderInDb(body);

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof OrderPayloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 },
    );
  }
}
