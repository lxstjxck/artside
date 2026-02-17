'use client'

import { useRef, useState } from 'react'

const categories = [
  'Графический дизайн',
  'Фотография',
  '3D art',
  'Game art',
  'UI/UX',
  'Архитектура',
  'Дизайн продуктов',
  'Дизайн сайтов',
  'Fan art',
];

const popularItems = Array.from({ length: 30 }, (_, index) => ({
  id: index + 1,
  title: '1',
}));

const recommendedItems = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
}));

export default function Home() {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const popularRef = useRef<HTMLDivElement | null>(null);

  const toggleCategory = (category: string) => {
    setActiveCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const clearCategories = () => {
    setActiveCategories([]);
  };

  const scrollPopular = (dir: number) => {
    if (!popularRef.current) return;
    const track = popularRef.current;
    const card = track.querySelector('.popular-card') as HTMLElement | null;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || '24') || 24;
    const amount = card ? card.offsetWidth + gap : 300;
    const maxScrollLeft = track.scrollWidth - track.clientWidth;
    const nextScrollLeft = track.scrollLeft + dir * amount;
    const edgeThreshold = 2;

    if (dir > 0 && nextScrollLeft >= maxScrollLeft - edgeThreshold) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    if (dir < 0 && nextScrollLeft <= edgeThreshold) {
      track.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      return;
    }

    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <main>
      <section className="pb-6">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-10 pb-6">
          <div className="flex items-center gap-3">
            <button className="chip chip-dark">Отслеживаемое</button>
            <button className="chip chip-dark">Понравившееся</button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {activeCategories.length > 0 && (
              <button
                className="clear-categories-btn"
                onClick={clearCategories}
                aria-label="Очистить выбранные категории"
                type="button"
              >
                ×
              </button>
            )}

            {categories.map((item) => (
              <button
                key={item}
                className={`chip ${activeCategories.includes(item) ? 'chip-dark' : 'chip-light'}`}
                onClick={() => toggleCategory(item)}
                aria-pressed={activeCategories.includes(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-dark">
        <div className="w-full px-10">
          <h2 className="section-title">Популярное</h2>
          <div className="relative">
            <button className="nav-arrow nav-arrow-left" onClick={() => scrollPopular(-1)} aria-label="Назад">
              ‹
            </button>
            <button className="nav-arrow nav-arrow-right" onClick={() => scrollPopular(1)} aria-label="Вперед">
              ›
            </button>

            <div ref={popularRef} className="popular-track">
              {popularItems.map((item) => (
                <div key={item.id} className="popular-card snap-start">
                  <div className="popular-thumb" />
                  <div className="popular-meta">
                    <span className="popular-title">{item.title}</span>
                    <span className="popular-dot" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="section-divider" />

        <div className="w-full px-10 pb-12">
          <h2 className="section-title">Рекомендации для вас</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
            {recommendedItems.map((item) => (
              <div key={item.id} className="recommend-card" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
