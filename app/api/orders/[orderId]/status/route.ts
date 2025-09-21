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

    // Update order status with timing
    let updateQuery = 'UPDATE orders SET status = $1';
    const values = [body.status, actualOrderId];
    
    // Add completed_at timestamp when order is completed
    if (body.status === 'completed') {
      updateQuery += ', completed_at = CURRENT_TIMESTAMP';
    }
    
    updateQuery += ' WHERE orderid = $2 RETURNING *';
    
    const result = await dbQuery(updateQuery, values);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If marking as completed, also mark all items as completed and deduct inventory
    if (body.status === 'completed') {
      await dbQuery(
        'UPDATE orderitems SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE orderid = $2',
        ['completed', actualOrderId]
      );
      
      // Deduct inventory based on completed order items
      await deductInventoryForCompletedOrder(actualOrderId);
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

// Function to deduct inventory when order is completed
async function deductInventoryForCompletedOrder(orderId: number) {
  try {
    console.log('Deducting inventory for completed order:', orderId);
    
    // Get all order items with their quantities
    const orderItemsResult = await dbQuery(`
      SELECT 
        oi.itemid,
        oi.quantity,
        mi.itemname
      FROM orderitems oi
      JOIN menuitems mi ON oi.itemid = mi.itemid
      WHERE oi.orderid = $1
    `, [orderId]);

    for (const orderItem of orderItemsResult.rows) {
      const { itemid, quantity: orderQuantity, itemname } = orderItem;
      
      console.log(`Processing ${itemname} (qty: ${orderQuantity})`);
      
      // Get recipe ingredients for this menu item
      const recipeResult = await dbQuery(`
        SELECT 
          mii.ingredientid,
          mii.quantityneeded,
          i.ingredientname,
          i.stockquantity,
          i.unit
        FROM menuitemingredients mii
        JOIN ingredients i ON mii.ingredientid = i.ingredientid
        WHERE mii.itemid = $1
      `, [itemid]);

      // Deduct each ingredient based on recipe and order quantity
      for (const ingredient of recipeResult.rows) {
        const { 
          ingredientid, 
          quantityneeded, 
          ingredientname, 
          stockquantity,
          unit 
        } = ingredient;
        
        const totalDeduction = parseFloat(quantityneeded) * parseInt(orderQuantity);
        const newStockQuantity = parseFloat(stockquantity) - totalDeduction;
        
        console.log(`Deducting ${ingredientname}: ${totalDeduction}${unit} (${stockquantity} -> ${newStockQuantity})`);
        
        // Update ingredient stock quantity
        await dbQuery(`
          UPDATE ingredients 
          SET 
            stockquantity = $1,
            "UpdatedAt" = CURRENT_TIMESTAMP
          WHERE ingredientid = $2
        `, [newStockQuantity, ingredientid]);
        
        // Log the inventory deduction
        console.log(`✅ Updated ${ingredientname}: ${stockquantity}${unit} -> ${newStockQuantity}${unit}`);
        
        // Optional: Log warning if stock goes below low threshold
        const lowThresholdResult = await dbQuery(`
          SELECT "LowThreshold" FROM ingredients WHERE ingredientid = $1
        `, [ingredientid]);
        
        const lowThreshold = parseFloat(lowThresholdResult.rows[0]?.LowThreshold || 0);
        if (newStockQuantity <= lowThreshold) {
          console.warn(`⚠️  LOW STOCK WARNING: ${ingredientname} is at ${newStockQuantity}${unit} (threshold: ${lowThreshold}${unit})`);
        }
      }
    }
    
    console.log('✅ Inventory deduction completed for order:', orderId);
    
  } catch (error) {
    console.error('Error deducting inventory:', error);
    // Don't throw error to prevent order completion from failing
    // Just log the error for monitoring
  }
}
