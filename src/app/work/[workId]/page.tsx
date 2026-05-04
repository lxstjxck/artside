import { notFound } from 'next/navigation';
import WorkViewContent from '@/app/components/work/WorkViewContent';
import { getWorkById } from '@/lib/work-catalog';

type WorkPageProps = {
  params: Promise<{
    workId: string;
  }>;
};

export default async function WorkPage({ params }: WorkPageProps) {
  const { workId } = await params;
  const id = Number(workId);
  const work = Number.isInteger(id) ? await getWorkById(id) : null;

  if (!work) {
    notFound();
  }

  return (
    <main className="section-dark px-6 py-6 md:px-10">
      <WorkViewContent work={work} closeHref={`/profile/${work.authorUsername}`} />
    </main>
  );
}
