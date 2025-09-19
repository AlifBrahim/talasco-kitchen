import { NextRequest, NextResponse } from 'next/server';
import { GetMenuItemsResponse } from '@shared/api';
import { dbQuery } from '@server/db';

type MenuItemRow = {
  id: string;
  org_id: string;
  sku: string | null;
  name: string;
  category: string | null;
  is_active: boolean;
  avg_prep_minutes: string | number | null;
  created_at: Date | string;
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
         id::text,
         org_id::text,
         sku,
         name,
         category,
         is_active,
         avg_prep_minutes,
         created_at
       FROM menu_items
       ${whereClause}
       ORDER BY created_at DESC`,
      values,
    );

    const response: GetMenuItemsResponse = {
      menu_items: result.rows.map((row) => ({
        id: row.id,
        org_id: row.org_id,
        sku: row.sku ?? undefined,
        name: row.name,
        category: row.category ?? undefined,
        is_active: row.is_active,
        avg_prep_minutes: row.avg_prep_minutes !== null ? Number(row.avg_prep_minutes) : undefined,
        created_at:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : new Date(row.created_at).toISOString(),
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
