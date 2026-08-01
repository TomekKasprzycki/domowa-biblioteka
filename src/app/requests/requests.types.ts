export type IncomingRequest = {
  id: string;
  book: { title: string; author: string };
  requester: { name: string; email: string };
  createdAt: Date;
};
