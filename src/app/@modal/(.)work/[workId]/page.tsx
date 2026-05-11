import { notFound } from 'next/navigation';
import WorkModal from '@/app/components/work/WorkModal';
import { getWorkById } from '@/lib/work-catalog';
import { getSessionUser } from '@/lib/session-user';

type WorkModalPageProps = {
  params: Promise<{
    workId: string;
  }>;
};

export default async function WorkModalPage({ params }: WorkModalPageProps) {
  const { workId } = await params;
  const id = Number(workId);
  const user = await getSessionUser();
  const work = Number.isInteger(id) ? await getWorkById(id, user?.id) : null;

  if (!work) {
    notFound();
  }

  return <WorkModal work={work} />;
}
