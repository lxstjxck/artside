import { useRef } from 'react'

const popularRef = useRef<HTMLDivElement | null>(null);

const scrollPopular = (dir: number) => {
  if (!popularRef.current) return;
  const card = popularRef.current.querySelector('.popular-card') as HTMLElement | null;
  const amount = card ? card.offsetWidth + 24 : 300;
  popularRef.current.scrollBy({ left: dir * amount, behavior: 'smooth'});
}

const categories = [
  'Иллюстрация',
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

const popularItems = Array.from({ length: 5 }, (_, index) => ({
  id: index + 1,
  title: 'kkkkkkkkkkkkkk',
}));

const recommendedItems = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
}));

export default function Home() {
  return (
    <main>
      <section className="pb-6">
        <div className="mx-auto flex w-full max-w-[1840px] flex-wrap items-center justify-between gap-4 px-10 pb-6">
          <div className="flex items-center gap-3">
            <button className="chip chip-dark">Отслеживаемое</button>
            <button className="chip chip-dark">Понравившееся</button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {categories.map((item) => (
              <button key={item} className="chip chip-light">
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-dark">
        <div className="mx-auto w-full max-w-[1840px] px-10">
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

        <div className="mx-auto w-full max-w-[1840px] px-10 pb-12">
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
