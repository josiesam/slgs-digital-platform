import { describe, expect, it } from "vitest";

import { createScopedGrant } from "@slgs/permissions";

import type { SessionIdentity } from "./index";
import { authorizeSimsIdentityAdministration } from "./lifecycle";

const identity = (
  application: "cms" | "sims",
  permissions: readonly string[],
): SessionIdentity => ({
  userId: "actor",
  sessionId: "session",
  grants: new Map([
    [
      application,
      createScopedGrant(application, [{ permissions, scopes: [] }]),
    ],
  ]),
});

describe("S.I.M.S.-owned identity lifecycle authorization", () => {
  it("permits an authenticated S.I.M.S. System Administrator", () => {
    expect(() =>
      authorizeSimsIdentityAdministration(
        identity("sims", ["identity:manage:sims"]),
      ),
    ).not.toThrow();
  });

  it("denies a forged CMS administrator identity", () => {
    expect(() =>
      authorizeSimsIdentityAdministration(
        identity("cms", ["membership:manage:cms"]),
      ),
    ).toThrow(/permission/i);
  });

  it("denies a S.I.M.S. actor without identity-management authority", () => {
    expect(() =>
      authorizeSimsIdentityAdministration(
        identity("sims", ["role:assign:approved"]),
      ),
    ).toThrow(/permission/i);
  });
});
