import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./routes/login";

describe("CMS authentication UI", () => {
  it("provides labelled credential fields and generic failure feedback", () => {
    const markup = renderToStaticMarkup(
      <LoginForm
        application="CMS"
        message="Sign-in was not accepted."
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain('type="email"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Sign-in was not accepted.");
  });
});
