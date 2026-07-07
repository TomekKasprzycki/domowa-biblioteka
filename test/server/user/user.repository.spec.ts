import { createUser, findByEmail } from "@/server/user/user.repository";
import { getDataSource } from "@/lib/data-source";

describe("userRepository", () => {
  const testEmail = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    const ds = await getDataSource();
    await ds.destroy();
  });

  it("creates a new user", async () => {
    const user = await createUser({
      email: testEmail,
      passwordHash: "hashed_password_value",
      name: "Test User",
    });
    expect(user.id).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe("Test User");
  });

  it("finds user by email", async () => {
    const user = await findByEmail(testEmail);
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);
  });

  it("returns null for unknown email", async () => {
    const user = await findByEmail("notfound@example.com");
    expect(user).toBeNull();
  });
});
