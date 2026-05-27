import { NextResponse } from 'next/server';
import { moderateWork } from '@/lib/moderation-store';
import { getSessionUser } from '@/lib/session-user';
import { getWorkOwnerInfo } from '@/lib/work-store';

type RouteParams = {
  params: Promise<{
    workId: string;
  }>;
};

const parseWorkId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(_: Request, { params }: RouteParams) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  const { workId } = await params;
  const id = parseWorkId(workId);
  if (!id) {
    return NextResponse.json({ message: 'Некорректный идентификатор работы.' }, { status: 400 });
  }

  const work = await getWorkOwnerInfo(id);
  if (!work) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }
  if (work.authorId !== user.id) {
    return NextResponse.json({ message: 'Можно проверять только свои работы.' }, { status: 403 });
  }

  const result = await moderateWork(id);
  if (!result) {
    return NextResponse.json({ message: 'Работа не найдена.' }, { status: 404 });
  }

  return NextResponse.json({
    status: result.status,
    issues: result.issues,
    message: result.status === 'published'
      ? 'Работа прошла базовую проверку и опубликована.'
      : 'Работа отклонена базовой проверкой. Исправьте замечания и отправьте повторно.',
  });
}
