import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

interface MenuItemAvailability {
  itemid: number;
  itemname: string;
  sku: string;
  available: boolean;
  missingIngredients: string[];
  stockStatus: 'available' | 'low_stock' | 'out_of_stock';
}

interface GetMenuAvailabilityResponse {
  items: MenuItemAvailability[];
}

export async function GET(_req: NextRequest) {
  try {
    // Get all active menu items
    const menuItemsResult = await dbQuery(`
      SELECT itemid, itemname, sku, is_active
      FROM menuitems 
      WHERE is_active = true
      ORDER BY itemname
    `);

    const availabilityResults: MenuItemAvailability[] = [];

    for (const menuItem of menuItemsResult.rows) {
      const { itemid, itemname, sku } = menuItem;
      
      // Get recipe ingredients for this menu item
      const recipeResult = await dbQuery(`
        SELECT 
          mii.ingredientid,
          mii.quantityneeded,
          i.ingredientname,
          i.stockquantity,
          i."LowThreshold" as lowthreshold,
          i.unit
        FROM menuitemingredients mii
        JOIN ingredients i ON mii.ingredientid = i.ingredientid
        WHERE mii.itemid = $1
      `, [itemid]);

      let available = true;
      let stockStatus: 'available' | 'low_stock' | 'out_of_stock' = 'available';
      const missingIngredients: string[] = [];
      
      // Check if all ingredients are available in sufficient quantities
      for (const ingredient of recipeResult.rows) {
        const {
          quantityneeded,
          ingredientname,
          stockquantity,
          lowthreshold,
          unit
        } = ingredient;
        
        const currentStock = parseFloat(stockquantity || 0);
        const needed = parseFloat(quantityneeded);
        const threshold = parseFloat(lowthreshold || 0);
        
        // Check if there's enough stock for at least 1 serving
        if (currentStock < needed) {
          available = false;
          stockStatus = 'out_of_stock';
          missingIngredients.push(`${ingredientname} (need ${needed}${unit}, have ${currentStock}${unit})`);
        } else if (currentStock <= threshold) {
          // Item is available but stock is low
          if (stockStatus !== 'out_of_stock') {
            stockStatus = 'low_stock';
          }
        }
      }
      
      // If no recipe ingredients found, consider the item unavailable
      if (recipeResult.rows.length === 0) {
        available = false;
        stockStatus = 'out_of_stock';
        missingIngredients.push('No recipe defined');
      }

      availabilityResults.push({
        itemid,
        itemname,
        sku,
        available,
        missingIngredients,
        stockStatus
      });
    }

    return NextResponse.json({
      items: availabilityResults
    } as GetMenuAvailabilityResponse);

  } catch (error) {
    console.error('Error checking menu availability:', error);
    return NextResponse.json(
      { error: 'Failed to check menu availability' },
      { status: 500 }
    );
  }
}

// Helper function to check if specific menu item is available
async function checkItemAvailability(itemId: number, requestedQuantity: number = 1) {
  try {
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
    `, [itemId]);

    const missingIngredients: string[] = [];
    
    for (const ingredient of recipeResult.rows) {
      const {
        quantityneeded,
        ingredientname,
        stockquantity,
        unit
      } = ingredient;
      
      const currentStock = parseFloat(stockquantity || 0);
      const totalNeeded = parseFloat(quantityneeded) * requestedQuantity;
      
      if (currentStock < totalNeeded) {
        missingIngredients.push(
          `${ingredientname} (need ${totalNeeded}${unit}, have ${currentStock}${unit})`
        );
      }
    }
    
    return {
      available: missingIngredients.length === 0,
      missingIngredients
    };
    
  } catch (error) {
    console.error('Error checking item availability:', error);
    return {
      available: false,
      missingIngredients: ['Error checking availability']
    };
  }
}
