export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
};

export type SessionPayload = {
  sub: string;
  username: string;
  email: string;
};