import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface RestockItem {
  id: string;
  recommendedQty: number;
}

interface RestockRequest {
  items: RestockItem[];
}

export async function POST(request: NextRequest) {
  try {
    const body: RestockRequest = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and cannot be empty' },
        { status: 400 }
      );
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.id || typeof item.recommendedQty !== 'number' || item.recommendedQty <= 0) {
        return NextResponse.json(
          { error: 'Each item must have valid id and recommendedQty > 0' },
          { status: 400 }
        );
      }
    }

    // Update inventory quantities by adding recommended amounts
    const updates = items.map(item => 
      dbQuery(
        `UPDATE ingredients 
         SET stockquantity = stockquantity + $1, "UpdatedAt" = now()
         WHERE ingredientid = $2
         RETURNING ingredientid, ingredientname, stockquantity, "UpdatedAt"`,
        [item.recommendedQty, item.id]
      )
    );

    const results = await Promise.all(updates);
    const updatedItems = results.map(result => {
      if (result.rows.length === 0) {
        throw new Error('Some ingredients not found');
      }
      const row = result.rows[0];
      return {
        id: row.ingredientid.toString(),
        name: row.ingredientname,
        newQuantity: Number(row.stockquantity),
        addedQuantity: 0, // Will be set below
        updated: row.UpdatedAt instanceof Date 
          ? row.UpdatedAt.toISOString() 
          : new Date(row.UpdatedAt).toISOString()
      };
    });

    // Add the added quantities back to the response
    const responseItems = updatedItems.map((item, index) => ({
      ...item,
      addedQuantity: items[index].recommendedQty
    }));

    return NextResponse.json({
      message: `Successfully restocked ${items.length} ingredients`,
      items: responseItems
    });

  } catch (error) {
    console.error('Error restocking inventory:', error);
    return NextResponse.json(
      { error: 'Failed to restock inventory' },
      { status: 500 }
    );
  }
}
