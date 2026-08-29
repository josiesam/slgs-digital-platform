import { describe, expect, it } from "vitest";

import { canAccessIdentityAdministration } from "./admin-policy";

describe("S.I.M.S. identity administration UI policy", () => {
  it("admits only identity or access administration capabilities", () => {
    expect(canAccessIdentityAdministration(["identity:manage:sims"])).toBe(
      true,
    );
    expect(canAccessIdentityAdministration(["membership:read:sims"])).toBe(
      true,
    );
    expect(canAccessIdentityAdministration(["student:read:school"])).toBe(
      false,
    );
    expect(canAccessIdentityAdministration(["membership:manage:cms"])).toBe(
      false,
    );
  });
});
