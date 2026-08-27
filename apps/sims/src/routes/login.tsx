import { createAuthClient } from "better-auth/react";
import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

const authClient = createAuthClient();

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
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
    await navigate({ to: "/" });
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm text-muted-foreground">
          SLGS private application
        </p>
        <h1 className="text-3xl font-semibold">Sign in to S.I.M.S.</h1>
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit}>
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
        {message ? <p role="alert">{message}</p> : null}
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          type="submit"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
