import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readBaseline = (name: string) =>
  readFileSync(resolve(process.cwd(), "drizzle-fresh", name), "utf8");

describe("fresh CMS/Public Web database baseline", () => {
  it("contains only active schemas and no discontinued S.I.M.S. objects", () => {
    const structural = readBaseline("0000_current-schema-baseline.sql");
    const security = readBaseline("0001_current-security-baseline.sql");

    expect(structural).toContain('CREATE SCHEMA "identity"');
    expect(structural).toContain('CREATE SCHEMA "cms"');
    expect(structural).toContain('CREATE SCHEMA "public_content"');
    expect(`${structural}\n${security}`).not.toMatch(
      /CREATE (?:SCHEMA|ROLE).*sims/i,
    );
    expect(security).not.toContain("slgs_sims");
  });

  it("preserves the server-side security boundary", () => {
    const security = readBaseline("0001_current-security-baseline.sql");

    expect(security).toContain("ENABLE ROW LEVEL SECURITY");
    expect(security).toContain("security_barrier = true");
    expect(security).toContain("cms_content_workflow_guard");
    expect(security).toContain("identity_security_audit_immutable");
    expect(security).toContain("content:read:cms");
    expect(security).toContain(
      "GRANT SELECT ON ALL TABLES IN SCHEMA public_content TO slgs_web",
    );
  });
});
