import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface UpdateStatusRequest {
  status: 'queued' | 'prepping' | 'ready' | 'served' | 'completed' | 'cancelled';
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string; itemId: string } }
) {
  try {
    const { orderId, itemId } = params;
    const body: UpdateStatusRequest = await request.json();
    
    // Parse itemId - handle both formats: "6" or "7-6" 
    let actualItemId: number;
    if (itemId.includes('-')) {
      // Format is "orderId-itemId", extract the itemId part
      actualItemId = parseInt(itemId.split('-')[1]);
    } else {
      // Format is just itemId
      actualItemId = parseInt(itemId);
    }
    
    const actualOrderId = parseInt(orderId);
    
    console.log('Updating order item:', { 
      orderId: actualOrderId, 
      itemId: actualItemId, 
      status: body.status,
      originalItemId: itemId 
    });

    // First check if the record exists
    const checkResult = await dbQuery(
      'SELECT * FROM orderitems WHERE orderid = $1 AND itemid = $2',
      [actualOrderId, actualItemId]
    );

    console.log('Found records:', checkResult.rows);

    if (checkResult.rowCount === 0) {
      // Let's see what records actually exist for this order
      const allItemsResult = await dbQuery(
        'SELECT orderid, itemid FROM orderitems WHERE orderid = $1',
        [actualOrderId]
      );
      
      console.log('All items for order:', allItemsResult.rows);
      
      return NextResponse.json(
        { 
          error: `Order item not found: orderId=${actualOrderId}, itemId=${actualItemId}`,
          availableItems: allItemsResult.rows,
          requestedItem: { orderId: actualOrderId, itemId: actualItemId }
        },
        { status: 404 }
      );
    }

    // Build update query based on status
    let updateQuery = 'UPDATE orderitems SET status = $1';
    const values: any[] = [body.status];
    let paramCount = 1;

    // Set timestamps based on status
    if (body.status === 'prepping') {
      // Check if it already has started_at
      if (!checkResult.rows[0]?.started_at) {
        updateQuery += `, started_at = CURRENT_TIMESTAMP`;
      }
    } else if (['ready', 'served', 'completed'].includes(body.status)) {
      updateQuery += `, completed_at = CURRENT_TIMESTAMP`;
    }

    updateQuery += ` WHERE orderid = $${++paramCount} AND itemid = $${++paramCount} RETURNING *`;
    values.push(actualOrderId, actualItemId);

    const result = await dbQuery(updateQuery, values);

    // Update order status based on item statuses
    await updateOrderStatus(actualOrderId);

    return NextResponse.json({
      success: true,
      orderItem: result.rows[0],
      message: `Order item status updated to ${body.status}`
    });

  } catch (error) {
    console.error('Error updating order item status:', error);
    return NextResponse.json(
      { error: 'Failed to update order item status', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to update order status based on item statuses
async function updateOrderStatus(orderId: number) {
  try {
    const itemsResult = await dbQuery(
      'SELECT status FROM orderitems WHERE orderid = $1',
      [orderId]
    );

    const itemStatuses = itemsResult.rows.map(row => row.status || 'queued');
    let newOrderStatus = 'open';

    // Determine order status based on item statuses
    if (itemStatuses.every(status => status === 'completed')) {
      newOrderStatus = 'completed';  // All items done
    } else if (itemStatuses.every(status => status === 'served')) {
      newOrderStatus = 'served';     // All items served
    } else if (itemStatuses.every(status => ['ready', 'served', 'completed'].includes(status))) {
      newOrderStatus = 'ready';      // All items ready or beyond
    } else if (itemStatuses.some(status => ['prepping', 'ready', 'served'].includes(status))) {
      newOrderStatus = 'in_progress'; // Some items being worked on
    }

    await dbQuery(
      'UPDATE orders SET status = $1 WHERE orderid = $2',
      [newOrderStatus, orderId]
    );
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}
