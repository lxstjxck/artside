import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthUser, SessionPayload } from '@/lib/auth-types';

const SESSION_COOKIE = 'artside_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const getSecret = () => {
  const value = process.env.AUTH_SECRET ?? 'dev-only-auth-secret-change-me';
  return new TextEncoder().encode(value);
};

export const createSessionToken = async (user: AuthUser) => {
  const payload: SessionPayload = {
    sub: user.id,
    username: user.username,
    email: user.email,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
};

export const verifySessionToken = async (token: string): Promise<SessionPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.username !== 'string') {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  } catch {
    return null;
  }
};

export const setSessionCookie = async (token: string) => {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
};

export const clearSessionCookie = async () => {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
};

export const getSessionCookie = async () => {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
};
