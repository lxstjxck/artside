import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AuthUser, StoredUser } from '@/lib/auth-types';

const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

type UsersFile = {
  users: StoredUser[];
};

const toPublicUser = (user: StoredUser): AuthUser => ({
  id: user.id,
  username: user.username,
  email: user.email,
});

const ensureUsersFile = async () => {
  try {
    await fs.access(usersFilePath);
  } catch {
    await fs.mkdir(path.dirname(usersFilePath), { recursive: true });
    await fs.writeFile(usersFilePath, JSON.stringify({ users: [] } satisfies UsersFile, null, 2), 'utf8');
  }
};

const readUsers = async (): Promise<StoredUser[]> => {
  await ensureUsersFile();

  try {
    const raw = await fs.readFile(usersFilePath, 'utf8');
    const parsed = JSON.parse(raw) as UsersFile;
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
};

const writeUsers = async (users: StoredUser[]) => {
  const payload: UsersFile = { users };
  await fs.writeFile(usersFilePath, JSON.stringify(payload, null, 2), 'utf8');
};

export const findUserByEmail = async (email: string): Promise<StoredUser | null> => {
  const users = await readUsers();
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
};

export const findUserById = async (id: string): Promise<StoredUser | null> => {
  const users = await readUsers();
  return users.find((user) => user.id === id) ?? null;
};

export const createUser = async (params: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<AuthUser> => {
  const users = await readUsers();
  const existing = users.find((user) => user.email.toLowerCase() === params.email.toLowerCase());

  if (existing) {
    throw new Error('EMAIL_IN_USE');
  }

  const nextUser: StoredUser = {
    id: randomUUID(),
    username: params.username,
    email: params.email,
    passwordHash: params.passwordHash,
  };

  users.push(nextUser);
  await writeUsers(users);

  return toPublicUser(nextUser);
};

export const mapStoredUserToPublic = toPublicUser;
