'use client';

import { useRouter } from 'next/navigation';

type WorkCloseButtonProps = {
  fallbackHref: string;
};

export default function WorkCloseButton({ fallbackHref }: WorkCloseButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="work-view-close"
      aria-label="Закрыть просмотр"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      ×
    </button>
  );
}
