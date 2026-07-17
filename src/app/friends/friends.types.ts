export type ReceivedInvite = {
  id: string;
  otherUser: { email: string; name: string };
  createdAt: Date;
};

export type Friend = {
  id: string;
  otherUser: { email: string; name: string };
  createdAt: Date;
};
