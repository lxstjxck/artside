export const LIKED_LIBRARY_FOLDER_ID = -1;
export const LIKED_LIBRARY_FOLDER_NAME = 'Понравившиеся';

export type SavedWorkItem = {
  id: number;
  folderId?: number | null;
  savedAt: string;
  title?: string;
  category?: string;
  author?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type LibraryFolderItem = {
  id: number;
  name: string;
  count: number;
  sortOrder: number;
  createdAt: string;
  system?: boolean;
};

export type SavedWorksResponse = {
  authenticated: boolean;
  items: SavedWorkItem[];
};
