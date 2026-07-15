import { DataSource } from "typeorm";
import {
  sendInviteAction,
  acceptInviteAction,
  rejectInviteAction,
  removeFriendAction,
} from "@/app/friends/actions";
import {
  findPendingSent,
  findPendingReceived,
  findFriends,
  findConnectionBetween,
} from "@/server/friend-connection/friend-connection.repository";
import { FriendConnectionEntity } from "@/server/friend-connection/friend-connection.entity";
import { createUser } from "@/server/user/user.repository";
import { UserEntity } from "@/server/user/user.entity";
import { getDataSource } from "@/lib/data-source";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
import { auth } from "@/auth";

// revalidatePath needs Next's request-scoped context, which doesn't exist
// when invoking a Server Action directly outside a real request/render.
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockAuth = auth as jest.Mock;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe("friends actions", () => {
  const suffix = Date.now();
  const emailA = `friend-action-a-${suffix}@example.com`;
  const emailB = `friend-action-b-${suffix}@example.com`;
  const emailC = `friend-action-c-${suffix}@example.com`;
  const emailD = `friend-action-d-${suffix}@example.com`;

  let ds: DataSource;
  let userA: string;
  let userB: string;
  let userC: string;
  let userD: string;
  let acConnectionId: string;
  let bdConnectionId: string;

  beforeAll(async () => {
    ds = await getDataSource();
    const a = await createUser({
      email: emailA,
      passwordHash: "hashed_password_value",
      name: "Friend Action A",
    });
    const b = await createUser({
      email: emailB,
      passwordHash: "hashed_password_value",
      name: "Friend Action B",
    });
    const c = await createUser({
      email: emailC,
      passwordHash: "hashed_password_value",
      name: "Friend Action C",
    });
    const d = await createUser({
      email: emailD,
      passwordHash: "hashed_password_value",
      name: "Friend Action D",
    });
    userA = a.id;
    userB = b.id;
    userC = c.id;
    userD = d.id;
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      const repo = ds.getRepository(FriendConnectionEntity);
      await repo.delete({ requesterId: userA });
      await repo.delete({ requesterId: userB });
      await repo.delete({ requesterId: userC });
      await repo.delete({ requesterId: userD });
      await repo.delete({ addresseeId: userA });
      await repo.delete({ addresseeId: userB });
      await repo.delete({ addresseeId: userC });
      await repo.delete({ addresseeId: userD });
      await ds.getRepository(UserEntity).delete({ email: emailA });
      await ds.getRepository(UserEntity).delete({ email: emailB });
      await ds.getRepository(UserEntity).delete({ email: emailC });
      await ds.getRepository(UserEntity).delete({ email: emailD });
      await ds.destroy();
    }
  });

  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("creates a pending connection when a valid invite is sent", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userA } });

    // when
    const result = await sendInviteAction(null, formData({ email: emailB }));

    // then
    expect(result).toBeNull();
    const sent = await findPendingSent(userA);
    expect(sent.some((c) => c.addressee.email === emailB)).toBe(true);
  });

  it("returns an unknown-email message when the email has no account", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userA } });

    // when
    const result = await sendInviteAction(
      null,
      formData({ email: `no-such-user-${suffix}@example.com` })
    );

    // then
    expect(result).toBe("No user found with that email.");
  });

  it("returns a self-invite message when inviting yourself", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userA } });

    // when
    const result = await sendInviteAction(null, formData({ email: emailA }));

    // then
    expect(result).toBe("You can't invite yourself.");
  });

  it("returns a duplicate message when re-inviting while pending in the same direction", async () => {
    // given
    // userA already has a pending invite to userB

    // when
    mockAuth.mockResolvedValue({ user: { id: userA } });
    const result = await sendInviteAction(null, formData({ email: emailB }));

    // then
    expect(result).toBe("You've already sent an invitation to this user.");
  });

  it("auto-accepts when the addressee invites back while pending", async () => {
    // given
    // userA has a pending invite to userB

    // when
    mockAuth.mockResolvedValue({ user: { id: userB } });
    const result = await sendInviteAction(null, formData({ email: emailA }));

    // then
    expect(result).toBeNull();
    const friends = await findFriends(userA);
    expect(
      friends.some(
        (c) => c.requester.email === emailB || c.addressee.email === emailB
      )
    ).toBe(true);
  });

  it("returns an already-friends message when inviting an already-connected user", async () => {
    // given
    // userA and userB are now connected

    // when
    mockAuth.mockResolvedValue({ user: { id: userA } });
    const result = await sendInviteAction(null, formData({ email: emailB }));

    // then
    expect(result).toBe("You're already friends with this user.");
  });

  it("sends a pending invite to a third user for ownership-scoping coverage", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userA } });

    // when
    const result = await sendInviteAction(null, formData({ email: emailC }));

    // then
    expect(result).toBeNull();
    const sent = await findPendingSent(userA);
    const item = sent.find((c) => c.addressee.email === emailC);
    expect(item).toBeDefined();
    acConnectionId = item!.id;
  });

  it("returns not-found when the acting user is the requester, not the addressee", async () => {
    // given
    // acConnectionId is pending with requester=userA, addressee=userC

    // when
    mockAuth.mockResolvedValue({ user: { id: userA } });
    const result = await acceptInviteAction(
      null,
      formData({ connectionId: acConnectionId })
    );

    // then
    expect(result).toBe(
      "Connection not found or you don't have permission to do that."
    );
  });

  it("returns not-found for a malformed connectionId", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userA } });

    // when
    const result = await acceptInviteAction(
      null,
      formData({ connectionId: "not-a-uuid" })
    );

    // then
    expect(result).toBe(
      "Connection not found or you don't have permission to do that."
    );
  });

  it("rejects a pending invite for the addressee", async () => {
    // given
    // acConnectionId is pending with requester=userA, addressee=userC

    // when
    mockAuth.mockResolvedValue({ user: { id: userC } });
    const result = await rejectInviteAction(
      null,
      formData({ connectionId: acConnectionId })
    );

    // then
    expect(result).toBeNull();
    const received = await findPendingReceived(userC);
    expect(received.some((c) => c.id === acConnectionId)).toBe(false);
  });

  it("re-invites after rejection and resets the connection to pending", async () => {
    // given
    // acConnectionId was just rejected

    // when
    mockAuth.mockResolvedValue({ user: { id: userC } });
    const result = await sendInviteAction(null, formData({ email: emailA }));

    // then
    expect(result).toBeNull();
    const current = await findConnectionBetween(userA, userC);
    expect(current?.id).toBe(acConnectionId);
    expect(current?.status).toBe("pending");
  });

  it("returns not-found from removeFriendAction for a pending connection", async () => {
    // given
    // acConnectionId is pending again after the re-invite above

    // when
    mockAuth.mockResolvedValue({ user: { id: userC } });
    const result = await removeFriendAction(
      null,
      formData({ connectionId: acConnectionId })
    );

    // then
    expect(result).toBe(
      "Connection not found or you don't have permission to do that."
    );
  });

  it("sends and accepts an invite for removeFriendAction coverage", async () => {
    // given
    mockAuth.mockResolvedValue({ user: { id: userB } });
    await sendInviteAction(null, formData({ email: emailD }));
    const sent = await findPendingSent(userB);
    const item = sent.find((c) => c.addressee.email === emailD);
    bdConnectionId = item!.id;

    // when
    mockAuth.mockResolvedValue({ user: { id: userD } });
    const result = await acceptInviteAction(
      null,
      formData({ connectionId: bdConnectionId })
    );

    // then
    expect(result).toBeNull();
  });

  it("returns not-found from removeFriendAction for an unrelated user", async () => {
    // given
    // bdConnectionId is an accepted connection between userB and userD

    // when
    mockAuth.mockResolvedValue({ user: { id: userA } });
    const result = await removeFriendAction(
      null,
      formData({ connectionId: bdConnectionId })
    );

    // then
    expect(result).toBe(
      "Connection not found or you don't have permission to do that."
    );
  });

  it("removes an accepted connection for either side", async () => {
    // given
    // bdConnectionId is an accepted connection between userB and userD

    // when
    mockAuth.mockResolvedValue({ user: { id: userB } });
    const result = await removeFriendAction(
      null,
      formData({ connectionId: bdConnectionId })
    );

    // then
    expect(result).toBeNull();
    const remaining = await findConnectionBetween(userB, userD);
    expect(remaining).toBeNull();
  });
});
