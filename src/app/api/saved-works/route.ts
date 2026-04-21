import { NextResponse } from 'next/server';
import { listSavedWorks, saveWork } from '@/lib/saved-work-store';
import { getSessionUser } from '@/lib/session-user';
import type { SavedWorkKind } from '@/lib/saved-work-types';

type SaveWorkBody = {
  kind?: SavedWorkKind;
  id?: number;
};

const isValidKind = (kind: string): kind is SavedWorkKind => kind === 'popular' || kind === 'recommendation';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, items: [] });
  }

  const items = await listSavedWorks(user.id);
  return NextResponse.json({ authenticated: true, items });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  let body: SaveWorkBody;
  try {
    body = (await request.json()) as SaveWorkBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const kind = body.kind;
  const normalizedId = typeof body.id === 'number' ? body.id : Number.NaN;

  if (!kind || !isValidKind(kind) || !Number.isInteger(normalizedId) || normalizedId <= 0) {
    return NextResponse.json({ message: 'Некорректные параметры сохранения.' }, { status: 400 });
  }

  const items = await saveWork(user.id, kind, normalizedId);
  return NextResponse.json({ authenticated: true, items });
}
