import { describe, expect, it, vi } from "vitest";

import { createResendEmailSender } from "./resend-email";

const environment = {
  RESEND_API_KEY: "synthetic-resend-key",
  RESEND_FROM_EMAIL: "identity@example.invalid",
};

describe("Resend password-recovery adapter", () => {
  it("sends the Better Auth recovery URL with an opaque idempotency key", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "synthetic-delivery-id" },
      error: null,
    });
    const sender = createResendEmailSender(environment, { emails: { send } });
    const resetUrl =
      "https://cms.example.invalid/api/auth/reset-password/example-secret";

    await sender.sendPasswordReset({
      email: "synthetic.user@example.invalid",
      resetUrl,
    });

    const [message, options] = send.mock.calls[0] as [
      { text: string; html: string; from: string; to: string[] },
      { idempotencyKey: string },
    ];
    expect(message.text).toContain(resetUrl);
    expect(message.html).toContain("Reset your password");
    expect(message.from).toBe(
      "SLGS Digital Platform <identity@example.invalid>",
    );
    expect(message.to).toEqual(["synthetic.user@example.invalid"]);
    expect(options.idempotencyKey).not.toContain("example-secret");
  });

  it("fails closed when Resend configuration is absent", async () => {
    const sender = createResendEmailSender(
      {},
      {
        emails: { send: vi.fn() },
      },
    );
    await expect(
      sender.sendPasswordReset({
        email: "synthetic.user@example.invalid",
        resetUrl: "https://cms.example.invalid/reset/example-secret",
      }),
    ).rejects.toThrow();
  });

  it("returns a generic failure without exposing provider details", async () => {
    const sender = createResendEmailSender(environment, {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "provider detail must not escape" },
        }),
      },
    });
    await expect(
      sender.sendPasswordReset({
        email: "synthetic.user@example.invalid",
        resetUrl: "https://cms.example.invalid/reset/example-secret",
      }),
    ).rejects.toThrow("Password recovery email delivery failed.");
  });

  it("rejects non-HTTPS recovery links outside localhost", async () => {
    const sender = createResendEmailSender(environment, {
      emails: { send: vi.fn() },
    });
    await expect(
      sender.sendPasswordReset({
        email: "synthetic.user@example.invalid",
        resetUrl: "http://cms.example.invalid/reset/example-secret",
      }),
    ).rejects.toThrow(/HTTPS/);
  });
});
