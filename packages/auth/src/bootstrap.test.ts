import { describe, expect, it } from "vitest";

import {
  assertSupportedBootstrapRequest,
  resolveBootstrapRole,
} from "./bootstrap";

describe("privileged administrator bootstrap policy", () => {
  it("allows an explicitly selected first CMS System Administrator", () => {
    expect(
      resolveBootstrapRole("cms", "cms_system_administrator"),
    ).toBe("cms_system_administrator");
    expect(() =>
      assertSupportedBootstrapRequest("cms", "cms_system_administrator"),
    ).not.toThrow();
  });

  it("does not silently elevate the existing CMS Administrator path", () => {
    expect(resolveBootstrapRole("cms")).toBe("cms_administrator");
  });

  it("rejects cross-application and unsupported bootstrap roles", () => {
    expect(() =>
      assertSupportedBootstrapRequest("sims", "cms_system_administrator"),
    ).toThrow(/application/i);
    expect(() =>
      resolveBootstrapRole("sims", "cms_system_administrator"),
    ).toThrow(/S\.I\.M\.S/i);
  });

  it("leaves the S.I.M.S. bootstrap role unchanged", () => {
    expect(resolveBootstrapRole("sims")).toBe(
      "sims_system_administrator",
    );
  });
});
