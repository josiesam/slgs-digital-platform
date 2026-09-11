import { describe, expect, it } from "vitest";

import {
  validateCmsAssignmentScopeValues,
  validateRoleAssignmentScopes,
} from "./authorization";

describe("role-assignment scope enforcement", () => {
  it("rejects an unscoped assignment for a scoped role", () => {
    expect(() => validateRoleAssignmentScopes(["club"], [])).toThrow(
      /requires an explicit assignment scope/i,
    );
  });

  it("rejects invented club and organisation scope values", () => {
    expect(() =>
      validateCmsAssignmentScopeValues(
        [{ dimension: "club", value: "invented" }],
        new Set(["news"]),
      ),
    ).toThrow(/active club/i);
    expect(() =>
      validateCmsAssignmentScopeValues(
        [{ dimension: "organisation", value: "external" }],
        new Set(),
      ),
    ).toThrow(/SLGS organisation/i);
    expect(() =>
      validateCmsAssignmentScopeValues(
        [
          { dimension: "club", value: "news" },
          { dimension: "organisation", value: "slgs" },
        ],
        new Set(["news"]),
      ),
    ).not.toThrow();
  });

  it("rejects a dimension outside the role contract", () => {
    expect(() =>
      validateRoleAssignmentScopes(
        ["club"],
        [{ dimension: "organisation", value: "editorial" }],
      ),
    ).toThrow(/not valid/i);
  });

  it("accepts global roles and explicit allowed scopes", () => {
    expect(() => validateRoleAssignmentScopes([], [])).not.toThrow();
    expect(() =>
      validateRoleAssignmentScopes(
        ["club", "organisation"],
        [{ dimension: "club", value: "news-journal" }],
      ),
    ).not.toThrow();
  });
});
