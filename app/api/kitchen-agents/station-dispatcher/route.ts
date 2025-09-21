import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') ?? 'Food';
  const limit = searchParams.get('limit') ?? '3';
  const base = process.env.API_BASE_URL ?? 'http://localhost:8000';
  const res = await fetch(
    `${base}/agents/station-dispatcher?category=${encodeURIComponent(category)}&limit=${encodeURIComponent(limit)}`,
    { cache: 'no-store' },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
