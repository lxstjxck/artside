import { NextResponse } from 'next/server';
import { listHomeFeed } from '@/lib/home-feed';
import { getSessionUser } from '@/lib/session-user';

const parsePositiveInt = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export async function GET(request: Request) {
  const user = await getSessionUser();
  const { searchParams } = new URL(request.url);
  const feed = await listHomeFeed(user?.id, {
    recommendationsOffset: parsePositiveInt(searchParams.get('recommendationsOffset')),
    recommendationsLimit: parsePositiveInt(searchParams.get('recommendationsLimit')),
    recommendationCategories: (searchParams.get('categories') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  });
  return NextResponse.json(feed);
}
