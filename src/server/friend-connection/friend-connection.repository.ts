import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";
import { FriendConnectionEntity } from "./friend-connection.entity";
import {
  FriendConnectionStatus,
  SendInviteResult,
} from "./friend-connection.types";

export async function findConnectionBetween(
  userA: string,
  userB: string
): Promise<FriendConnectionEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  return repo.findOne({
    where: [
      { requesterId: userA, addresseeId: userB },
      { requesterId: userB, addresseeId: userA },
    ],
  });
}

export async function sendInvite(
  requesterId: string,
  addresseeId: string
): Promise<SendInviteResult> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  const existing = await findConnectionBetween(requesterId, addresseeId);

  if (!existing) {
    const connection = repo.create({
      id: generateId(),
      requesterId,
      addresseeId,
      status: FriendConnectionStatus.PENDING,
    });
    return { connection: await repo.save(connection), autoAccepted: false };
  }

  if (existing.status === FriendConnectionStatus.ACCEPTED) {
    return "already-friends";
  }

  if (existing.status === FriendConnectionStatus.REJECTED) {
    existing.requesterId = requesterId;
    existing.addresseeId = addresseeId;
    existing.status = FriendConnectionStatus.PENDING;
    return { connection: await repo.save(existing), autoAccepted: false };
  }

  // existing.status === FriendConnectionStatus.PENDING
  if (existing.addresseeId === requesterId) {
    existing.status = FriendConnectionStatus.ACCEPTED;
    return { connection: await repo.save(existing), autoAccepted: true };
  }

  return "duplicate";
}

export async function findPendingReceived(
  userId: string
): Promise<FriendConnectionEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  return repo.find({
    where: { addresseeId: userId, status: FriendConnectionStatus.PENDING },
    order: { createdAt: "DESC" },
    relations: { requester: true },
  });
}

export async function findPendingSent(
  userId: string
): Promise<FriendConnectionEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  return repo.find({
    where: { requesterId: userId, status: FriendConnectionStatus.PENDING },
    order: { createdAt: "DESC" },
    relations: { addressee: true },
  });
}

export async function findFriends(
  userId: string
): Promise<FriendConnectionEntity[]> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  return repo.find({
    where: [
      { requesterId: userId, status: FriendConnectionStatus.ACCEPTED },
      { addresseeId: userId, status: FriendConnectionStatus.ACCEPTED },
    ],
    order: { updatedAt: "DESC" },
    relations: { requester: true, addressee: true },
  });
}

export async function isConfirmedFriend(
  userA: string,
  userB: string
): Promise<boolean> {
  const connection = await findConnectionBetween(userA, userB);
  return connection?.status === FriendConnectionStatus.ACCEPTED;
}

export async function findFriendUsers(
  userId: string
): Promise<{ id: string; name: string; email: string }[]> {
  const connections = await findFriends(userId);
  return connections.map((c) => {
    const other = c.requesterId === userId ? c.addressee : c.requester;
    return { id: other.id, name: other.name, email: other.email };
  });
}

export async function updateStatus(
  id: string,
  actingUserId: string,
  status: Exclude<FriendConnectionStatus, typeof FriendConnectionStatus.PENDING>
): Promise<FriendConnectionEntity | null> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  const result = await repo.update(
    { id, addresseeId: actingUserId },
    { status }
  );
  if (!result.affected) return null;
  return repo.findOne({ where: { id, addresseeId: actingUserId } });
}

export async function deleteConnection(
  id: string,
  actingUserId: string
): Promise<boolean> {
  const ds = await getDataSource();
  const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
  const result = await repo.delete([
    { id, status: FriendConnectionStatus.ACCEPTED, requesterId: actingUserId },
    { id, status: FriendConnectionStatus.ACCEPTED, addresseeId: actingUserId },
  ]);
  return !!result.affected;
}
