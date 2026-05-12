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
};

export type SavedWorksResponse = {
  authenticated: boolean;
  items: SavedWorkItem[];
};
