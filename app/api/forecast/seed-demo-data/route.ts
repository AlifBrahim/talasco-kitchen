import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    // First, let's check if we have any existing data
    const existingOrders = await dbQuery('SELECT COUNT(*) as count FROM orders');
    
    if (parseInt(existingOrders.rows[0].count) > 10) {
      return NextResponse.json({
        message: 'Demo data already exists. Skipping seed.',
        existing_orders: parseInt(existingOrders.rows[0].count)
      });
    }

    // Get menu items to create orders for
    const menuItems = await dbQuery(`
      SELECT id, name, category, avg_prep_minutes
      FROM menu_items
      WHERE is_active = true
      LIMIT 10
    `);

    if (menuItems.rows.length === 0) {
      return NextResponse.json({
        error: 'No menu items found. Please add menu items first.'
      }, { status: 400 });
    }

    // Generate demo orders for the last 30 days
    const demoOrders = [];
    const now = new Date();
    
    for (let i = 0; i < 30; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - i);
      
      // Generate 3-8 orders per day
      const ordersPerDay = Math.floor(Math.random() * 6) + 3;
      
      for (let j = 0; j < ordersPerDay; j++) {
        const orderTime = new Date(orderDate);
        orderTime.setHours(Math.floor(Math.random() * 12) + 11); // 11 AM to 11 PM
        orderTime.setMinutes(Math.floor(Math.random() * 60));
        
        // Create order
        const orderResult = await dbQuery(`
          INSERT INTO orders (location_id, source, status, placed_at)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          'default',
          ['dine_in', 'qr', 'kiosk', 'phone', 'delivery'][Math.floor(Math.random() * 5)],
          'completed',
          orderTime.toISOString()
        ]);
        
        const orderId = orderResult.rows[0].id;
        
        // Add 1-4 items per order
        const itemsPerOrder = Math.floor(Math.random() * 4) + 1;
        const selectedItems = menuItems.rows
          .sort(() => 0.5 - Math.random())
          .slice(0, itemsPerOrder);
        
        for (const item of selectedItems) {
          const quantity = Math.floor(Math.random() * 3) + 1;
          const prepTime = item.avg_prep_minutes || 5;
          const actualPrepSeconds = (prepTime + Math.random() * 5) * 60; // Add some variance
          
          await dbQuery(`
            INSERT INTO order_items (
              order_id, menu_item_id, qty, status, 
              predicted_prep_minutes, actual_prep_seconds,
              created_at, started_at, completed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            orderId,
            item.id,
            quantity,
            'completed',
            prepTime,
            Math.round(actualPrepSeconds),
            orderTime.toISOString(),
            new Date(orderTime.getTime() + Math.random() * 60000).toISOString(), // Start within 1 minute
            new Date(orderTime.getTime() + actualPrepSeconds * 1000).toISOString()
          ]);
        }
      }
    }

    // Get final count
    const finalCount = await dbQuery('SELECT COUNT(*) as count FROM orders');
    
    return NextResponse.json({
      message: 'Demo data seeded successfully',
      orders_created: parseInt(finalCount.rows[0].count),
      menu_items_used: menuItems.rows.length,
      date_range: {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error seeding demo data:', error);
    return NextResponse.json(
      { error: 'Failed to seed demo data' },
      { status: 500 }
    );
  }
}
