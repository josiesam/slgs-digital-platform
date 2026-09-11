import { describe, expect, it } from "vitest";

import { assertCmsUserStatusChangeAllowed } from "./lifecycle";

describe("CMS user lifecycle policy", () => {
  it.each(["suspended", "deactivated"] as const)("denies self-%s", (status) => {
    expect(() =>
      assertCmsUserStatusChangeAllowed("actor", "actor", status),
    ).toThrow("cannot suspend or deactivate their own account");
  });

  it("allows self-activation and changes to another user", () => {
    expect(() =>
      assertCmsUserStatusChangeAllowed("actor", "actor", "active"),
    ).not.toThrow();
    expect(() =>
      assertCmsUserStatusChangeAllowed("actor", "target", "suspended"),
    ).not.toThrow();
  });
});
