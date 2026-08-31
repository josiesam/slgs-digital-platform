import { describe, expect, it } from "vitest";

import {
  canNavigateToSimsCore,
  canCreateSimsCoreResource,
  canReadSimsCoreResource,
  canUpdateSimsCoreResource,
  coreMutationRequestSchema,
  requiresLifecycleConfirmation,
} from "./core-policy";

describe("Phase 2B application boundary", () => {
  it("shows core navigation only for an explicit S.I.M.S. core read permission", () => {
    expect(canNavigateToSimsCore(["student:read:school"])).toBe(true);
    expect(canNavigateToSimsCore(["role:assign:approved"])).toBe(false);
    expect(canNavigateToSimsCore(["content:read:assigned"])).toBe(false);
  });

  it("filters each core resource and control by its explicit permission", () => {
    const permissions = ["student:read:assigned", "student:update:assigned"];
    expect(canReadSimsCoreResource(permissions, "students")).toBe(true);
    expect(canReadSimsCoreResource(permissions, "staff")).toBe(false);
    expect(canCreateSimsCoreResource(permissions, "students")).toBe(false);
    expect(canUpdateSimsCoreResource(permissions, "students")).toBe(true);
  });

  it("does not accept browser actor identity as mutation authority", () => {
    const parsed = coreMutationRequestSchema.parse({
      resource: "students",
      actorId: "browser-supplied-actor",
      payload: {},
    });
    expect(parsed).not.toHaveProperty("actorId");
  });

  it("requires confirmation for non-destructive lifecycle closure", () => {
    expect(requiresLifecycleConfirmation("active", "archived")).toBe(true);
    expect(requiresLifecycleConfirmation("active", "closed")).toBe(true);
    expect(requiresLifecycleConfirmation("active", "active")).toBe(false);
  });
});
