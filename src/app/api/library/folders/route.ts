import { NextResponse } from 'next/server';
import { createLibraryFolder, deleteLibraryFolder, reorderLibraryFolders } from '@/lib/saved-work-store';
import { LIKED_LIBRARY_FOLDER_ID } from '@/lib/saved-work-types';
import { getSessionUser } from '@/lib/session-user';

type CreateFolderBody = {
  name?: string;
};

type ReorderFoldersBody = {
  folderIds?: number[];
};

type DeleteFolderBody = {
  folderId?: number;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  let body: CreateFolderBody;
  try {
    body = (await request.json()) as CreateFolderBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  try {
    const folders = await createLibraryFolder(user.id, body.name ?? '');
    return NextResponse.json({ authenticated: true, folders });
  } catch (error) {
    const message = error instanceof Error && error.message === 'EMPTY_FOLDER_NAME'
      ? 'Введите название папки.'
      : error instanceof Error && error.message === 'SYSTEM_FOLDER_NAME'
        ? 'Это системная папка библиотеки.'
        : 'Папка с таким названием уже существует.';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  let body: ReorderFoldersBody;
  try {
    body = (await request.json()) as ReorderFoldersBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  if (!Array.isArray(body.folderIds) || body.folderIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    return NextResponse.json({ message: 'Некорректный порядок папок.' }, { status: 400 });
  }

  const folders = await reorderLibraryFolders(user.id, body.folderIds);
  return NextResponse.json({ authenticated: true, folders });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ message: 'Требуется авторизация.' }, { status: 401 });
  }

  let body: DeleteFolderBody;
  try {
    body = (await request.json()) as DeleteFolderBody;
  } catch {
    return NextResponse.json({ message: 'Некорректный JSON.' }, { status: 400 });
  }

  const folderId = typeof body.folderId === 'number' ? body.folderId : Number.NaN;
  if ((!Number.isInteger(folderId) || folderId <= 0) && folderId !== LIKED_LIBRARY_FOLDER_ID) {
    return NextResponse.json({ message: 'Некорректная папка.' }, { status: 400 });
  }

  try {
    const folders = await deleteLibraryFolder(user.id, folderId);
    return NextResponse.json({ authenticated: true, folders });
  } catch (error) {
    const isDefaultFolder = error instanceof Error && error.message === 'DEFAULT_FOLDER';
    return NextResponse.json({
      message: isDefaultFolder ? 'Эту системную папку нельзя удалить.' : 'Папка не найдена.',
    }, { status: isDefaultFolder ? 400 : 404 });
  }
}
