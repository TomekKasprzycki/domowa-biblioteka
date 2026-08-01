export type OutgoingLoan = {
  id: string;
  book: { title: string; author: string };
  owner: { name: string };
  status: "requested" | "active" | "declined";
  startedAt: Date | null;
};
