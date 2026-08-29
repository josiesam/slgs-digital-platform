import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginForm } from "./routes/login";

describe("S.I.M.S. login", () => {
  it("provides labelled credentials and a generic denial message", () => {
    const markup = renderToStaticMarkup(
      <LoginForm initialMessage="Sign-in was not accepted." />,
    );
    expect(markup).toContain("Email");
    expect(markup).toContain("Password");
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("User not found");
  });
});
