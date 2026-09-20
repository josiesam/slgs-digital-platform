import { describe, expect, it, vi } from "vitest";

import type { createSlgsAuth } from "./server";
import { createApplicationSessionReader } from "./session-reader";

describe("SessionReader cache and invalidation policy", () => {
  function createMockDeps() {
    const getSessionMock = vi.fn();
    const mockAuth = {
      api: {
        getSession: getSessionMock,
      },
    } as unknown as ReturnType<typeof createSlgsAuth>;

    const selectMock = vi.fn();
    const mockDatabase = {
      select: selectMock,
    } as any;

    return { getSessionMock, selectMock, mockAuth, mockDatabase };
  }

  function mockDbIdentityAndMembership(selectMock: ReturnType<typeof vi.fn>) {
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => [
            { id: "mem-123", application: "cms", status: "active" },
          ],
        }),
        innerJoin: () => ({ where: () => [] }),
      }),
    }));
  }

  it("returns null immediately when request contains no cookie or authorization header", async () => {
    const { getSessionMock, mockAuth, mockDatabase } = createMockDeps();
    const reader = createApplicationSessionReader({
      application: "cms",
      auth: mockAuth,
      database: mockDatabase,
    });

    const request = new Request("http://localhost/test");
    const identity = await reader.read(request);

    expect(identity).toBeNull();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("caches session identity on subsequent reads within TTL", async () => {
    const { getSessionMock, selectMock, mockAuth, mockDatabase } =
      createMockDeps();

    getSessionMock.mockResolvedValue({
      user: { id: "user-123" },
      session: { id: "sess-456" },
    });

    mockDbIdentityAndMembership(selectMock);

    const reader = createApplicationSessionReader({
      application: "cms",
      auth: mockAuth,
      database: mockDatabase,
      cacheTtlMs: 60000,
    });

    const req1 = new Request("http://localhost/test", {
      headers: { cookie: "better-auth.session_token=valid" },
    });

    const identity1 = await reader.read(req1);
    expect(identity1).not.toBeNull();
    expect(identity1?.userId).toBe("user-123");
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    // Second request with same headers should hit cache
    const req2 = new Request("http://localhost/test", {
      headers: { cookie: "better-auth.session_token=valid" },
    });
    const identity2 = await reader.read(req2);
    expect(identity2).toEqual(identity1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when bypassCache option is true", async () => {
    const { getSessionMock, selectMock, mockAuth, mockDatabase } =
      createMockDeps();

    getSessionMock.mockResolvedValue({
      user: { id: "user-123" },
      session: { id: "sess-456" },
    });

    mockDbIdentityAndMembership(selectMock);

    const reader = createApplicationSessionReader({
      application: "cms",
      auth: mockAuth,
      database: mockDatabase,
      cacheTtlMs: 60000,
    });

    const req = new Request("http://localhost/test", {
      headers: { cookie: "better-auth.session_token=valid" },
    });

    await reader.read(req);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    await reader.read(req, { bypassCache: true });
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it("invalidates user cache correctly when invalidateUser is called", async () => {
    const { getSessionMock, selectMock, mockAuth, mockDatabase } =
      createMockDeps();

    getSessionMock.mockResolvedValue({
      user: { id: "user-999" },
      session: { id: "sess-999" },
    });

    mockDbIdentityAndMembership(selectMock);

    const reader = createApplicationSessionReader({
      application: "cms",
      auth: mockAuth,
      database: mockDatabase,
      cacheTtlMs: 60000,
    });

    const req = new Request("http://localhost/test", {
      headers: { cookie: "better-auth.session_token=user999" },
    });

    const res1 = await reader.read(req);
    expect(res1?.userId).toBe("user-999");
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    // Invalidate user-999
    reader.invalidateUser("user-999");

    // Next request should hit DB again
    const res2 = await reader.read(req);
    expect(res2?.userId).toBe("user-999");
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it("clears entire cache when clearCache is called", async () => {
    const { getSessionMock, selectMock, mockAuth, mockDatabase } =
      createMockDeps();

    getSessionMock.mockResolvedValue({
      user: { id: "user-777" },
      session: { id: "sess-777" },
    });

    mockDbIdentityAndMembership(selectMock);

    const reader = createApplicationSessionReader({
      application: "cms",
      auth: mockAuth,
      database: mockDatabase,
      cacheTtlMs: 60000,
    });

    const req = new Request("http://localhost/test", {
      headers: { cookie: "better-auth.session_token=user777" },
    });

    await reader.read(req);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    reader.clearCache();

    await reader.read(req);
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });
});
