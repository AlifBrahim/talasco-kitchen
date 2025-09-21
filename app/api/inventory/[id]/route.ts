import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface UpdateInventoryRequest {
  quantity: number;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateInventoryRequest = await request.json();
    const { id } = params;

    if (!body.quantity || body.quantity < 0) {
      return NextResponse.json(
        { error: 'Invalid quantity value' },
        { status: 400 }
      );
    }

    // Update the inventory quantity in the database
    const result = await dbQuery(
      `UPDATE ingredients 
       SET stockquantity = $1, "UpdatedAt" = now()
       WHERE ingredientid = $2
       RETURNING ingredientid, ingredientname, stockquantity, "UpdatedAt"`,
      [body.quantity, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    const updatedItem = result.rows[0];

    return NextResponse.json({
      id: updatedItem.ingredientid.toString(),
      name: updatedItem.ingredientname,
      quantity: Number(updatedItem.stockquantity),
      updated: updatedItem.UpdatedAt instanceof Date 
        ? updatedItem.UpdatedAt.toISOString() 
        : new Date(updatedItem.UpdatedAt).toISOString()
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
