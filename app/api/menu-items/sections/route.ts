import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type MenuItemSectionRow = {
  itemid: number;
  itemname: string;
  sectionid: number;
  sectionname: string;
  max_capacity: number;
};

export async function GET(request: NextRequest) {
  try {
    // Join menu items with their sections using direct sectionid column
    const result = await dbQuery<MenuItemSectionRow>(`
      SELECT 
        mi.itemid,
        mi.itemname,
        s.sectionid,
        s.sectionname,
        s.max_capacity
      FROM menuitems mi
      LEFT JOIN sections s ON mi.sectionid = s.sectionid
      WHERE mi.is_active = true
      ORDER BY mi.itemname ASC
    `);

    const menuItems = result.rows.map((row) => ({
      itemid: row.itemid,
      itemname: row.itemname,
      section: row.sectionid ? {
        sectionid: row.sectionid,
        sectionname: row.sectionname,
        max_capacity: row.max_capacity
      } : null
    }));

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu item sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch menu item sections' },
      { status: 500 }
    );
  }
}
