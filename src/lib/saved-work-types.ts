export type SavedWorkItem = {
  id: number;
  savedAt: string;
  title?: string;
  category?: string;
  author?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type SavedWorksResponse = {
  authenticated: boolean;
  items: SavedWorkItem[];
};
