import { NextResponse } from 'next/server';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
};

export const checkRateLimit = ({ key, limit, windowMs }: RateLimitOptions) => {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count <= limit) {
    return { limited: false, retryAfter: 0 };
  }

  return {
    limited: true,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  };
};

export const rateLimitResponse = (retryAfter: number) => {
  return NextResponse.json(
    { message: 'Слишком много запросов. Попробуйте позже.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
      },
    }
  );
};
