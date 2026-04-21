import { notFound } from 'next/navigation';
import WorkModal from '@/app/components/work/WorkModal';
import { getWorkBySlug } from '@/lib/work-catalog';

type WorkModalPageProps = {
  params: Promise<{
    workId: string;
  }>;
};

export default async function WorkModalPage({ params }: WorkModalPageProps) {
  const { workId } = await params;
  const work = getWorkBySlug(workId);

  if (!work) {
    notFound();
  }

  return <WorkModal work={work} />;
}
