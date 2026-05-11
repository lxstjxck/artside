export type AuthUser = {
  id: string;
  username: string;
  email: string;
};

export type UserProfile = {
  nickname: string;
  location: string;
  bio: string;
  avatarUrl: string;
  avatarKey?: string | null;
  notifyLikes: boolean;
  notifyComments: boolean;
  emailNotifications: boolean;
};

export type StoredUser = AuthUser & {
  passwordHash: string;
  profile: UserProfile;
};

export type SessionPayload = {
  sub: string;
  username: string;
  email: string;
};
