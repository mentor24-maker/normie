import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { findAuthUserByEmail, listAllAuthUsers } from "./auth-users";

function buildUser(index: number, email?: string): User {
  return { id: `user-${index}`, email } as User;
}

function buildClient(pages: User[][]) {
  const listUsers = vi.fn(async ({ page }: { page: number; perPage: number }) => ({
    data: { users: pages[page - 1] ?? [] },
    error: null
  }));

  return {
    client: { auth: { admin: { listUsers } } } as unknown as SupabaseClient,
    listUsers
  };
}

function buildFullPage(startIndex: number): User[] {
  return Array.from({ length: 1000 }, (_, i) => buildUser(startIndex + i, `u${startIndex + i}@x.com`));
}

describe("findAuthUserByEmail", () => {
  it("finds a user beyond the first page of 1000", async () => {
    const target = buildUser(9999, "deep@example.com");
    const { client, listUsers } = buildClient([buildFullPage(0), [buildUser(1000), target]]);

    const found = await findAuthUserByEmail(client, "Deep@Example.com");

    expect(found).toBe(target);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("stops early when found on the first page", async () => {
    const target = buildUser(1, "first@example.com");
    const { client, listUsers } = buildClient([[target]]);

    expect(await findAuthUserByEmail(client, "first@example.com")).toBe(target);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });

  it("returns null when no user matches across all pages", async () => {
    const { client, listUsers } = buildClient([buildFullPage(0), [buildUser(1000, "last@x.com")]]);

    expect(await findAuthUserByEmail(client, "missing@example.com")).toBeNull();
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("returns null for a blank email without calling the API", async () => {
    const { client, listUsers } = buildClient([[]]);

    expect(await findAuthUserByEmail(client, "   ")).toBeNull();
    expect(listUsers).not.toHaveBeenCalled();
  });

  it("throws on API errors", async () => {
    const listUsers = vi.fn(async () => ({ data: { users: [] }, error: { message: "boom" } }));
    const client = { auth: { admin: { listUsers } } } as unknown as SupabaseClient;

    await expect(findAuthUserByEmail(client, "a@b.com")).rejects.toThrow("boom");
  });
});

describe("listAllAuthUsers", () => {
  it("concatenates users across pages", async () => {
    const lastUser = buildUser(1000, "tail@x.com");
    const { client, listUsers } = buildClient([buildFullPage(0), [lastUser]]);

    const users = await listAllAuthUsers(client);

    expect(users).toHaveLength(1001);
    expect(users[1000]).toBe(lastUser);
    expect(listUsers).toHaveBeenCalledTimes(2);
  });

  it("returns a single short page directly", async () => {
    const { client, listUsers } = buildClient([[buildUser(1, "only@x.com")]]);

    expect(await listAllAuthUsers(client)).toHaveLength(1);
    expect(listUsers).toHaveBeenCalledTimes(1);
  });
});
