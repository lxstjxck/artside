import { NextResponse } from 'next/server';
import { listHomeFeed } from '@/lib/home-feed';

export async function GET() {
  const feed = await listHomeFeed();
  return NextResponse.json(feed);
}
