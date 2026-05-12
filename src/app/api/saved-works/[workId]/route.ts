import { NextResponse } from 'next/server';
import { moveSavedWork, removeWork } from '@/lib/saved-work-store';
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = Number(workId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  let body: { folderId?: number };
  try {
    body = (await request.json()) as { folderId?: number };
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const folderId = typeof body.folderId === 'number' ? body.folderId : Number.NaN;
  if (!Number.isInteger(folderId) || folderId <= 0) {
    return NextResponse.json({ message: 'Некорректная папка.' }, { status: 400 });
  }

  try {
    const items = await moveSavedWork(user.id, id, folderId);
    return NextResponse.json({ authenticated: true, items });
  } catch {
    return NextResponse.json({ message: 'Папка не найдена.' }, { status: 404 });
  }
}
