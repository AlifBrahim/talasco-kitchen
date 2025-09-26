import { NextRequest, NextResponse } from 'next/server';
import { dbQuery } from '@server/db';

type SectionRow = {
  sectionid: number;
  sectionname: string;
  max_capacity: number;
};

type SectionWithColor = {
  sectionid: number;
  sectionname: string;
  max_capacity: number;
  color: {
    bgStart: string;
    bgEnd: string;
    border: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const result = await dbQuery<SectionRow>(`
      SELECT sectionid, sectionname, max_capacity
      FROM sections
      ORDER BY sectionid ASC
    `);

    // Generate professional kitchen section colors
    const generateSectionColors = (sectionName: string) => {
      // Define professional color palettes for each kitchen section
      const sectionColors: Record<string, {bgStart: string, bgEnd: string, border: string}> = {
        'Grill': {
          bgStart: '#fef3e2', // Warm orange cream
          bgEnd: '#fed7aa',   // Light orange
          border: '#fb923c'   // Orange border
        },
        'Fryer': {
          bgStart: '#fef2f2', // Light red
          bgEnd: '#fecaca',   // Light red
          border: '#f87171'   // Red border
        },
        'Salad': {
          bgStart: '#f0fdf4', // Light green
          bgEnd: '#bbf7d0',   // Light green
          border: '#4ade80'   // Green border
        },
        'Drinks': {
          bgStart: '#eff6ff', // Light blue
          bgEnd: '#bfdbfe',   // Light blue
          border: '#60a5fa'   // Blue border
        },
        'Dessert': {
          bgStart: '#fdf4ff', // Light purple
          bgEnd: '#e9d5ff',   // Light purple
          border: '#a855f7'   // Purple border
        },
        'Pizza': {
          bgStart: '#fffbeb', // Light amber
          bgEnd: '#fde68a',   // Light amber
          border: '#f59e0b'   // Amber border
        },
        'Sushi': {
          bgStart: '#ecfdf5', // Light emerald
          bgEnd: '#a7f3d0',   // Light emerald
          border: '#10b981'   // Emerald border
        },
        'Cold Kitchen': {
          bgStart: '#f8fafc', // Light slate
          bgEnd: '#e2e8f0',   // Light slate
          border: '#64748b'   // Slate border
        }
      };

      // Return specific colors for known sections, or generate based on name
      if (sectionColors[sectionName]) {
        return sectionColors[sectionName];
      }

      // Fallback: generate based on section name hash
      let hash = 0;
      for (let i = 0; i < sectionName.length; i++) {
        hash = ((hash << 5) - hash) + sectionName.charCodeAt(i);
        hash |= 0;
      }
      const hue = ((hash % 360) + 360) % 360;
      const s = 45; // Softer saturation
      const l1 = 96; // Very light start
      const l2 = 88; // Light end
      const lBorder = 70; // Medium border
      
      return {
        bgStart: `hsl(${hue} ${s}% ${l1}%)`,
        bgEnd: `hsl(${hue} ${s}% ${l2}%)`,
        border: `hsl(${hue} ${s}% ${lBorder}%)`
      };
    };

    const sections: SectionWithColor[] = result.rows.map((row) => ({
      sectionid: row.sectionid,
      sectionname: row.sectionname,
      max_capacity: row.max_capacity,
      color: generateSectionColors(row.sectionname)
    }));

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}
