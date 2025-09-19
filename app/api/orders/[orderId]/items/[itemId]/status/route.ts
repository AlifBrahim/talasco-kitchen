import { NextRequest, NextResponse } from 'next/server';
import { UpdateOrderItemStatusRequest, UpdateOrderItemStatusResponse } from '@shared/api';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const body: UpdateOrderItemStatusRequest = await request.json();
    const { orderId, itemId } = params;

    // Validate required fields
    if (!body.status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Mock implementation - in real app, update database
    const updatedOrderItem = {
      id: itemId,
      order_id: orderId,
      menu_item_id: 'menu-item-1', // This would come from the existing order item
      qty: 1,
      notes: '',
      status: body.status,
      created_at: new Date().toISOString(),
      started_at: body.status === 'prepping' ? new Date().toISOString() : undefined,
      completed_at: body.status === 'served' ? new Date().toISOString() : undefined
    };

    const response: UpdateOrderItemStatusResponse = {
      success: true,
      order_item: updatedOrderItem
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating order item status:', error);
    return NextResponse.json(
      { error: 'Failed to update order item status' },
      { status: 500 }
    );
  }
}
