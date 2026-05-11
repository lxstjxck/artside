import { NextResponse } from 'next/server';
import { listHomeFeed } from '@/lib/home-feed';
import { getSessionUser } from '@/lib/session-user';

export async function GET() {
  const user = await getSessionUser();
  const feed = await listHomeFeed(user?.id);
  return NextResponse.json(feed);
}
