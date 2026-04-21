import { NextResponse } from 'next/server';
import { removeWork } from '@/lib/saved-work-store';
import { getSessionUser } from '@/lib/session-user';
import type { SavedWorkKind } from '@/lib/saved-work-types';

type RouteParams = {
  params: Promise<{
    workId: string;
  }>;
};

const parseWorkId = (value: string): { kind: SavedWorkKind; id: number } | null => {
  const match = value.match(/^(popular|recommendation)-(\d+)$/);
  if (!match) return null;

  const id = Number(match[2]);
  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    kind: match[1] as SavedWorkKind,
    id,
  };
};

export async function DELETE(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const parsed = parseWorkId(workId);
  if (!parsed) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const items = await removeWork(user.id, parsed.kind, parsed.id);
  return NextResponse.json({ authenticated: true, items });
}
