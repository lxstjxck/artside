export type SavedWorkKind = 'popular' | 'recommendation';

export type SavedWorkItem = {
  kind: SavedWorkKind;
  id: number;
  savedAt: string;
};

export type SavedWorksResponse = {
  authenticated: boolean;
  items: SavedWorkItem[];
};
