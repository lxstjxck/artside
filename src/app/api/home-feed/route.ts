import { NextResponse } from 'next/server';
import { homeFeedData } from '@/lib/home-feed';

export async function GET() {
  return NextResponse.json(homeFeedData);
}
