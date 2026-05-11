import { createHash, randomBytes } from 'node:crypto';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = 30;

const hashResetToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const createPasswordResetToken = async (userId: string) => {
  await ensureDatabaseSchema();

  const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: {
      userId,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    data: {
      usedAt: new Date(),
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
};

export const findValidPasswordResetToken = async (token: string) => {
  await ensureDatabaseSchema();

  if (!token) {
    return null;
  }

  return prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashResetToken(token),
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: true,
    },
  });
};

export const markPasswordResetTokenUsed = async (id: number) => {
  await ensureDatabaseSchema();

  await prisma.passwordResetToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
};

