import { NextResponse } from 'next/server';
import { removeWork } from '@/lib/saved-work-store';
import { getSessionUser } from '@/lib/session-user';

type RouteParams = {
  params: Promise<{
    workId: string;
  }>;
};

export async function DELETE(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = Number(workId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const items = await removeWork(user.id, id);
  return NextResponse.json({ authenticated: true, items });
}
