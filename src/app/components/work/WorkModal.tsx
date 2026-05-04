'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkDetail } from '@/lib/work-catalog';
import WorkViewContent from '@/app/components/work/WorkViewContent';

type WorkModalProps = {
  work: WorkDetail;
};

export default function WorkModal({ work }: WorkModalProps) {
  const router = useRouter();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.back();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [router]);

  return (
    <div className="work-modal-overlay" onClick={() => router.back()}>
      <div className="work-modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="work-modal-close" onClick={() => router.back()} aria-label="Закрыть просмотр">
          ×
        </button>
        <WorkViewContent work={work} closeHref="/" />
      </div>
    </div>
  );
}
