import { createAuthClient } from "better-auth/react";
import type { SubmitEvent } from "react";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

const authClient = createAuthClient();

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    if (result.error) {
      setMessage("Sign-in was not accepted.");
      return;
    }
    await navigate({ to: "/dashboard" });
  }

  return <LoginForm application="CMS" message={message} onSubmit={submit} />;
}

export function LoginForm(props: {
  application: string;
  message: string;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="home-hero">
      <main className="auth-card">
        <div className="mb-4 flex justify-center flex-col items-center">
          <img src="/favicon-96x96.png" alt="logo" width="64px" />
          <h1 className="text-3xl font-semibold">
            Sign in to {props.application}
          </h1>
        </div>
        <form className="flex flex-col gap-4" onSubmit={props.onSubmit}>
          <label className="flex flex-col gap-2">
            Email
            <input
              className="rounded-md border bg-background px-3 py-2"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            Password
            <input
              className="rounded-md border bg-background px-3 py-2"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {props.message ? <p role="alert">{props.message}</p> : null}
          <button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            type="submit"
          >
            Sign in
          </button>
        </form>
      </main>
    </section>
  );
}
