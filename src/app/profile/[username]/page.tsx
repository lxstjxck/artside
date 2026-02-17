type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return (
    <main>
      <h1>Профиль</h1>
      <p>Пользователь: {username}</p>
    </main>
  );
}
