import { NextResponse } from 'next/server';
import { listLibraryFolders, listSavedWorks } from '@/lib/saved-work-store';
import { LIKED_LIBRARY_FOLDER_ID } from '@/lib/saved-work-types';
import { getSessionUser } from '@/lib/session-user';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, folders: [], items: [] });
  }

  const { searchParams } = new URL(request.url);
  const folderId = Number(searchParams.get('folderId'));
  const normalizedFolderId = folderId === LIKED_LIBRARY_FOLDER_ID || (Number.isInteger(folderId) && folderId > 0)
    ? folderId
    : null;

  const [folders, items] = await Promise.all([
    listLibraryFolders(user.id),
    listSavedWorks(user.id, normalizedFolderId),
  ]);

  return NextResponse.json({ authenticated: true, folders, items });
}
