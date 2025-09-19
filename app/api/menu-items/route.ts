import { NextRequest, NextResponse } from 'next/server';
import { GetMenuItemsResponse } from '@shared/api';

// Mock data for now - replace with actual database queries
const mockMenuItems = [
  {
    id: '1',
    org_id: 'org-1',
    sku: 'PIZZA-001',
    name: 'Margherita Pizza',
    category: 'Pizza',
    is_active: true,
    avg_prep_minutes: 15,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    org_id: 'org-1',
    sku: 'SALAD-001',
    name: 'Caesar Salad',
    category: 'Salad',
    is_active: true,
    avg_prep_minutes: 8,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    org_id: 'org-1',
    sku: 'PASTA-001',
    name: 'Spaghetti Carbonara',
    category: 'Pasta',
    is_active: true,
    avg_prep_minutes: 20,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '4',
    org_id: 'org-1',
    sku: 'BURGER-001',
    name: 'Classic Burger',
    category: 'Main',
    is_active: true,
    avg_prep_minutes: 12,
    created_at: '2024-01-01T00:00:00Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    let filteredItems = mockMenuItems;

    if (category) {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    if (active !== null) {
      const isActive = active === 'true';
      filteredItems = filteredItems.filter(item => item.is_active === isActive);
    }

    const response: GetMenuItemsResponse = {
      menu_items: filteredItems
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
