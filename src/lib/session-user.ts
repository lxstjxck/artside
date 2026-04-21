import { getSessionCookie, verifySessionToken } from '@/lib/auth-session';
import { findUserById, mapStoredUserToPublic } from '@/lib/user-store';

export const getSessionUser = async () => {
  const token = await getSessionCookie();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await findUserById(payload.sub);
  if (!user) return null;

  return mapStoredUserToPublic(user);
};
