type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const topWorks = Array.from({ length: 4 }, (_, index) => ({
    id: index + 1,
    title: 'KKKKKKKKKKKKKK',
  }));

  const illustrationWorks = Array.from({ length: 5 }, (_, index) => index + 1);
  const webDesignWorks = Array.from({ length: 3 }, (_, index) => index + 1);

  return (
    <main className="min-h-[calc(100vh-90px)] border-t border-white/25 bg-[#111111] px-6 py-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1840px] grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="rounded-3xl bg-gradient-to-br from-[#93b8d8] via-[#9fa5c7] to-[#a76a92] p-6 text-black shadow-soft">
          <div className="mb-6 flex justify-end">
            <span className="h-7 w-36 rounded-full bg-white/80 shadow-md" />
          </div>

          <div className="mb-6 flex justify-center">
            <div className="h-40 w-40 rounded-full bg-[#05080e]" />
          </div>

          <h1 className="mb-7 text-center text-4xl font-black tracking-wide">{username.toUpperCase()}</h1>

          <div className="mb-6 flex items-center gap-3 text-base text-black/80">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>КККККККККККККК</span>
          </div>

          <button
            type="button"
            className="mb-6 h-12 w-full rounded-xl bg-white/85 text-base font-semibold text-black shadow-md transition-colors hover:bg-white"
          />

          <p className="text-[18px] leading-[1.3] text-black/75">
            ККККККККККККККККККККК
          </p>
        </aside>

        <section className="space-y-8 pt-4">
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topWorks.map((work) => (
                <div key={work.id} className="space-y-3">
                  <div className="aspect-[4/3] rounded-sm bg-[#858585]" />
                  <p className="text-sm text-white/75">{work.title}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <span className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-black">Иллюстрация</span>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {illustrationWorks.map((work) => (
                <div key={work} className="aspect-square rounded-xl bg-[#858585]" />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <span className="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-bold text-black">Дизайн сайтов</span>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {webDesignWorks.map((work) => (
                <div key={work} className="aspect-square rounded-xl bg-[#858585]" />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
