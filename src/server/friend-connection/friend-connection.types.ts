import type { FriendConnectionEntity } from "./friend-connection.entity";

export const FriendConnectionStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
} as const;

export type FriendConnectionStatus =
  (typeof FriendConnectionStatus)[keyof typeof FriendConnectionStatus];

export type SendInviteResult =
  | { connection: FriendConnectionEntity; autoAccepted: boolean }
  | "duplicate"
  | "already-friends";
