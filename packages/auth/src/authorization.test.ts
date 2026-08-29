import { describe, expect, it } from "vitest";

import { validateRoleAssignmentScopes } from "./authorization";

describe("role-assignment scope enforcement", () => {
  it("rejects an unscoped assignment for a scoped role", () => {
    expect(() => validateRoleAssignmentScopes(["department"], [])).toThrow(
      /requires an explicit assignment scope/i,
    );
  });

  it("rejects a dimension outside the role contract", () => {
    expect(() =>
      validateRoleAssignmentScopes(
        ["department"],
        [{ dimension: "location", value: "laboratory" }],
      ),
    ).toThrow(/not valid/i);
  });

  it("accepts global roles and explicit allowed scopes", () => {
    expect(() => validateRoleAssignmentScopes([], [])).not.toThrow();
    expect(() =>
      validateRoleAssignmentScopes(
        ["department", "location"],
        [{ dimension: "location", value: "laboratory" }],
      ),
    ).not.toThrow();
  });
});
