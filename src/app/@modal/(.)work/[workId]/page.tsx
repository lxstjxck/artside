import { notFound } from 'next/navigation';
import WorkModal from '@/app/components/work/WorkModal';
import { getWorkById } from '@/lib/work-catalog';

type WorkModalPageProps = {
  params: Promise<{
    workId: string;
  }>;
};

export default async function WorkModalPage({ params }: WorkModalPageProps) {
  const { workId } = await params;
  const id = Number(workId);
  const work = Number.isInteger(id) ? await getWorkById(id) : null;

  if (!work) {
    notFound();
  }

  return <WorkModal work={work} />;
}
