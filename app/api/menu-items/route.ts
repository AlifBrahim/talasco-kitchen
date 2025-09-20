import { NextRequest, NextResponse } from 'next/server';
import { GetMenuItemsResponse } from '@shared/api';
import { dbQuery } from '@server/db';

type MenuItemRow = {
  itemid: number;
  sku: string;
  itemname: string;
  price: string | number;
  category: string;
  is_active: boolean;
  image_path: string | null;
};

// Map SKU to image filename
const getImagePath = (sku: string): string => {
  const skuToImage: Record<string, string> = {
    'BURGER': '/menu/burger.png',
    'FRIES': '/menu/fries.png',
    'BANANA': '/menu/banana-boat.png',
    'COFFEE': '/menu/coffee.png',
    'ICETEA': '/menu/ice-tea.png',
    'SHAKE': '/menu/milkshake.png',
  };
  
  return skuToImage[sku.toUpperCase()] || '/menu/default.png';
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    const conditions: string[] = [];
    const values: Array<string | boolean> = [];

    if (category) {
      conditions.push(`category = $${conditions.length + 1}`);
      values.push(category);
    }

    if (active !== null) {
      conditions.push(`is_active = $${conditions.length + 1}`);
      values.push(active === 'true');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await dbQuery<MenuItemRow>(
      `SELECT
         itemid,
         sku,
         itemname,
         price,
         category,
         is_active,
         image_path
       FROM menuitems
       ${whereClause}
       ORDER BY itemid DESC`,
      values,
    );

    const response: GetMenuItemsResponse = {
      menu_items: result.rows.map((row) => ({
        id: row.itemid.toString(),
        org_id: '1',
        sku: row.sku,
        name: row.itemname,
        category: row.category,
        is_active: row.is_active,
        avg_prep_minutes: undefined,
        created_at: new Date().toISOString(),
        price: Number(row.price),
        image_path: row.image_path || getImagePath(row.sku), // Use DB value or map from SKU
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}