import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.API_BASE_URL ?? 'http://localhost:8000';
  const res = await fetch(`${base}/agents/sla-watchdog`, { cache: 'no-store' });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
