import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface UpdateOrderStatusRequest {
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'completed' | 'cancelled';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const body: UpdateOrderStatusRequest = await request.json();
    
    const actualOrderId = parseInt(orderId);
    
    console.log('Updating order status:', { 
      orderId: actualOrderId, 
      status: body.status 
    });

    // Update order status
    const result = await dbQuery(
      'UPDATE orders SET status = $1 WHERE orderid = $2 RETURNING *',
      [body.status, actualOrderId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If marking as completed, also mark all items as completed
    if (body.status === 'completed') {
      await dbQuery(
        'UPDATE orderitems SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE orderid = $2',
        ['completed', actualOrderId]
      );
    }

    return NextResponse.json({
      success: true,
      order: result.rows[0],
      message: `Order status updated to ${body.status}`
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status', details: error.message },
      { status: 500 }
    );
  }
}
