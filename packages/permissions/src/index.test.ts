import { describe, expect, it } from "vitest";

import {
  createGrant,
  isAllowed,
  permissionSchema,
  PermissionDeniedError,
  requirePermission,
} from "./index";

describe("application-scoped permissions", () => {
  it("denies access when no grant exists", () => {
    expect(
      isAllowed(undefined, "sims", permissionSchema.parse("students:read")),
    ).toBe(false);
  });

  it("does not reuse a CMS permission grant in S.I.M.S.", () => {
    const grant = createGrant("cms", ["content:publish"]);

    expect(
      isAllowed(grant, "sims", permissionSchema.parse("content:publish")),
    ).toBe(false);
  });

  it("throws a predictable error for a denied action", () => {
    expect(() =>
      requirePermission(
        undefined,
        "cms",
        permissionSchema.parse("content:publish"),
      ),
    ).toThrow(PermissionDeniedError);
  });

  it("rejects permissions outside the documented grammar", () => {
    expect(permissionSchema.safeParse("publish").success).toBe(false);
  });
});
