export type IncomingRequest = {
  id: string;
  book: { title: string; author: string };
  requester: { name: string; email: string };
  createdAt: Date;
};

// A loan the borrower has marked returned, waiting on the owner to confirm
// receipt. Kept separate from IncomingRequest because the two render different
// actions; startedAt lets the owner see how long the book was out.
export type PendingReturn = {
  id: string;
  book: { title: string; author: string };
  requester: { name: string; email: string };
  startedAt: Date | null;
};
