export type DiscoverFriend = { id: string; name: string; email: string };

export type DiscoverBook = {
  id: string;
  title: string;
  author: string;
  notes: string | null;
  createdAt: Date;
  owner: { id: string; name: string; email: string };
};
