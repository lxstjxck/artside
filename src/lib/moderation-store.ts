import { moderateContent, type ModerationResult } from '@/lib/content-moderation';
import { ensureDatabaseSchema } from '@/lib/db-bootstrap';
import { prisma } from '@/lib/prisma';
import { parseTags } from '@/lib/work-store';

export const moderateWork = async (workId: number): Promise<ModerationResult | null> => {
  await ensureDatabaseSchema();

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      imageUrl: true,
    },
  });

  if (!work) return null;

  const result = moderateContent({
    title: work.title,
    description: work.description,
    tags: parseTags(work.tags),
    imageUrl: work.imageUrl,
  });

  await prisma.work.update({
    where: { id: work.id },
    data: { status: result.status },
  });

  return result;
};
