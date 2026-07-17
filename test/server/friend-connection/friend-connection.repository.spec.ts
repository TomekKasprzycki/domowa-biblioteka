import { DataSource } from "typeorm";
import {
  findConnectionBetween,
  sendInvite,
  findPendingReceived,
  findPendingSent,
  findFriends,
  updateStatus,
  deleteConnection,
} from "@/server/friend-connection/friend-connection.repository";
import { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { FriendConnectionStatus } from "@/server/friend-connection/friend-connection.types";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";
import { generateId } from "@/lib/generate-id.utils";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("friendConnectionRepository", () => {
  const suffix = Date.now();
  const emailA = `friend-a-${suffix}@example.com`;
  const emailB = `friend-b-${suffix}@example.com`;
  const emailC = `friend-c-${suffix}@example.com`;

  let ds: DataSource;
  let userA: string;
  let userB: string;
  let userC: string;
  let abConnectionId: string;
  let acConnectionId: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const a = await createUser({
      email: emailA,
      passwordHash: "hashed_password_value",
      name: "Friend A",
    });
    const b = await createUser({
      email: emailB,
      passwordHash: "hashed_password_value",
      name: "Friend B",
    });
    const c = await createUser({
      email: emailC,
      passwordHash: "hashed_password_value",
      name: "Friend C",
    });
    userA = a.id;
    userB = b.id;
    userC = c.id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      const repo = ds.getRepository(FriendConnectionEntity);
      await repo.delete({ requesterId: userA });
      await repo.delete({ requesterId: userB });
      await repo.delete({ requesterId: userC });
      await repo.delete({ addresseeId: userA });
      await repo.delete({ addresseeId: userB });
      await repo.delete({ addresseeId: userC });
      await ds.getRepository(UserEntity).delete({ email: emailA });
      await ds.getRepository(UserEntity).delete({ email: emailB });
      await ds.getRepository(UserEntity).delete({ email: emailC });
      await ds.destroy();
    }
  });

  it("creates a pending connection when none exists between the two users", async () => {
    // given
    // no connection exists between userA and userB

    // when
    const result = await sendInvite(userA, userB);

    // then
    if (typeof result === "string") throw new Error("expected an object");
    expect(result.autoAccepted).toBe(false);
    expect(result.connection.id).toMatch(UUID_REGEX);
    expect(result.connection.requesterId).toBe(userA);
    expect(result.connection.addresseeId).toBe(userB);
    expect(result.connection.status).toBe(FriendConnectionStatus.PENDING);
    abConnectionId = result.connection.id;
  });

  it("returns duplicate when the same requester invites again while pending", async () => {
    // given
    // a pending connection already exists from userA to userB

    // when
    const result = await sendInvite(userA, userB);

    // then
    expect(result).toBe("duplicate");
    const current = await findConnectionBetween(userA, userB);
    expect(current?.id).toBe(abConnectionId);
    expect(current?.status).toBe(FriendConnectionStatus.PENDING);
  });

  it("returns null from updateStatus when the acting user is the requester, not the addressee", async () => {
    // given
    // abConnectionId is pending with requester=userA, addressee=userB

    // when
    const result = await updateStatus(
      abConnectionId,
      userA,
      FriendConnectionStatus.ACCEPTED
    );

    // then
    expect(result).toBeNull();
  });

  it("returns null from updateStatus for a user unrelated to the connection", async () => {
    // given
    // abConnectionId is pending with requester=userA, addressee=userB

    // when
    const result = await updateStatus(
      abConnectionId,
      userC,
      FriendConnectionStatus.ACCEPTED
    );

    // then
    expect(result).toBeNull();
  });

  it("rejects the connection for the addressee", async () => {
    // given
    // abConnectionId is pending with requester=userA, addressee=userB

    // when
    const result = await updateStatus(
      abConnectionId,
      userB,
      FriendConnectionStatus.REJECTED
    );

    // then
    expect(result?.id).toBe(abConnectionId);
    expect(result?.status).toBe(FriendConnectionStatus.REJECTED);
  });

  it("re-invites after rejection by flipping direction and reusing the same row", async () => {
    // given
    // abConnectionId is rejected

    // when
    const result = await sendInvite(userB, userA);

    // then
    if (typeof result === "string") throw new Error("expected an object");
    expect(result.autoAccepted).toBe(false);
    expect(result.connection.id).toBe(abConnectionId);
    expect(result.connection.requesterId).toBe(userB);
    expect(result.connection.addresseeId).toBe(userA);
    expect(result.connection.status).toBe(FriendConnectionStatus.PENDING);

    const rowCount = await ds
      .getRepository(FriendConnectionEntity)
      .count({ where: [{ requesterId: userA, addresseeId: userB }, { requesterId: userB, addresseeId: userA }] });
    expect(rowCount).toBe(1);
  });

  it("auto-accepts when the addressee sends an invite back while pending", async () => {
    // given
    // abConnectionId is pending with requester=userB, addressee=userA (from the re-invite above)

    // when
    const result = await sendInvite(userA, userB);

    // then
    if (typeof result === "string") throw new Error("expected an object");
    expect(result.autoAccepted).toBe(true);
    expect(result.connection.id).toBe(abConnectionId);
    expect(result.connection.status).toBe(FriendConnectionStatus.ACCEPTED);
  });

  it("returns already-friends when inviting an already-connected user", async () => {
    // given
    // abConnectionId is now accepted

    // when
    const result = await sendInvite(userB, userA);

    // then
    expect(result).toBe("already-friends");
  });

  it("sends a pending invite to a third user for findPending* coverage", async () => {
    // given
    // no connection exists between userA and userC

    // when
    const result = await sendInvite(userA, userC);

    // then
    if (typeof result === "string") throw new Error("expected an object");
    expect(result.connection.status).toBe(FriendConnectionStatus.PENDING);
    acConnectionId = result.connection.id;
  });

  it("findPendingSent returns the request with the addressee relation populated", async () => {
    // given
    // acConnectionId is a pending invite from userA to userC

    // when
    const results = await findPendingSent(userA);

    // then
    const item = results.find((r) => r.id === acConnectionId);
    expect(item).toBeDefined();
    expect(item?.addressee.email).toBe(emailC);
  });

  it("findPendingReceived returns the request with the requester relation populated", async () => {
    // given
    // acConnectionId is a pending invite from userA to userC

    // when
    const results = await findPendingReceived(userC);

    // then
    const item = results.find((r) => r.id === acConnectionId);
    expect(item).toBeDefined();
    expect(item?.requester.email).toBe(emailA);
  });

  it("findFriends returns accepted connections with both relations populated", async () => {
    // given
    // abConnectionId is accepted between userA and userB

    // when
    const resultsForA = await findFriends(userA);
    const resultsForB = await findFriends(userB);

    // then
    const itemForA = resultsForA.find((r) => r.id === abConnectionId);
    const itemForB = resultsForB.find((r) => r.id === abConnectionId);
    expect(itemForA).toBeDefined();
    expect(itemForB).toBeDefined();
    expect(itemForA?.requester.email).toBe(emailB);
    expect(itemForA?.addressee.email).toBe(emailA);
  });

  it("returns false from deleteConnection for a pending connection", async () => {
    // given
    // acConnectionId is pending, not accepted

    // when
    const result = await deleteConnection(acConnectionId, userA);

    // then
    expect(result).toBe(false);
  });

  it("returns false from deleteConnection for a user unrelated to the connection", async () => {
    // given
    // abConnectionId is accepted between userA and userB

    // when
    const result = await deleteConnection(abConnectionId, userC);

    // then
    expect(result).toBe(false);
  });

  it("removes an accepted connection for either side", async () => {
    // given
    // abConnectionId is accepted between userA and userB

    // when
    const result = await deleteConnection(abConnectionId, userA);

    // then
    expect(result).toBe(true);
    const remaining = await findConnectionBetween(userA, userB);
    expect(remaining).toBeNull();
  });

  it("rejects a direct insert of the reverse-direction pair with a DB constraint violation", async () => {
    // given
    // acConnectionId still exists as a pending connection between userA and userC

    // when / then
    const repo = ds.getRepository<FriendConnectionEntity>("friend_connections");
    await expect(
      repo.save(
        repo.create({
          id: generateId(),
          requesterId: userC,
          addresseeId: userA,
          status: FriendConnectionStatus.PENDING,
        })
      )
    ).rejects.toMatchObject({ code: "23505" });
  });
});
