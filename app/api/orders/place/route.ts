import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface PlaceOrderRequest {
  tableNumber?: string;
  items: {
    itemId: number;
    quantity: number;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const body: PlaceOrderRequest = await request.json();
    
    // Insert order with 'in_progress' status instead of 'open'
    const orderResult = await dbQuery(`
      INSERT INTO orders (tablenumber, status, orderdate)
      VALUES ($1, 'in_progress', CURRENT_TIMESTAMP)
      RETURNING orderid
    `, [body.tableNumber || null]);

    const orderId = orderResult.rows[0].orderid;

    // Insert order items
    for (const item of body.items) {
      await dbQuery(`
        INSERT INTO orderitems (orderid, itemid, quantity)
        VALUES ($1, $2, $3)
      `, [orderId, item.itemId, item.quantity]);
    }

    return NextResponse.json({ 
      success: true, 
      orderId: orderId,
      message: 'Order placed successfully' 
    });

  } catch (error) {
    console.error('Error placing order:', error);
    return NextResponse.json(
      { error: 'Failed to place order' },
      { status: 500 }
    );
  }
}
