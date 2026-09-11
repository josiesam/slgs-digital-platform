import { describe, expect, it } from "vitest";
import {
  assertSupportedBootstrapRequest,
  resolveBootstrapRole,
} from "./bootstrap";

describe("CMS administrator bootstrap policy", () => {
  it("defaults to CMS Administrator and permits explicit CMS System Administrator", () => {
    expect(resolveBootstrapRole("cms")).toBe("cms_administrator");
    expect(resolveBootstrapRole("cms", "cms_system_administrator")).toBe(
      "cms_system_administrator",
    );
    expect(() =>
      assertSupportedBootstrapRequest("cms", "cms_system_administrator"),
    ).not.toThrow();
  });

  it("rejects unsupported role keys", () => {
    expect(() => resolveBootstrapRole("cms", "system_administrator")).toThrow(
      /CMS bootstrap role/i,
    );
  });
});
