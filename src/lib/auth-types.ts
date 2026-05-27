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
  professionalSkills: string[];
  professionalSoftware: string[];
  publicEmail: string;
  showPublicEmail: boolean;
  hiringTypes: string[];
  socialLinks: {
    portfolio?: string;
    website?: string;
    telegram?: string;
    vk?: string;
    dzen?: string;
    rutube?: string;
    boosty?: string;
  };
  publishReady: boolean;
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
