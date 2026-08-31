import { requireIdentity } from "@slgs/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { sessions } from "./auth.server";

export const getCurrentSimsIdentity = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = new Request("http://internal.slgs/sims-session", {
      headers: getRequestHeaders(),
    });
    const identity = await requireIdentity(sessions, request);
    return {
      userId: identity.userId,
      permissions: [...(identity.grants.get("sims")?.permissions ?? [])],
    };
  },
);
