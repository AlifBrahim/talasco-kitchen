import { NextRequest, NextResponse } from 'next/server';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = searchParams.get('limit') ?? '5';

    const base = process.env.API_BASE_URL ?? 'http://localhost:8000';
    const url = `${base}/queue?${category ? `category=${encodeURIComponent(category)}&` : ''}limit=${encodeURIComponent(limit)}`;

    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('Queue proxy error:', e);
    return NextResponse.json([], { status: 200 });
  }
}
