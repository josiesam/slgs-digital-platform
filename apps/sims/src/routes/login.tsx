import { createAuthClient } from "better-auth/react";
import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

const authClient = createAuthClient();

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  return <LoginForm onSuccess={() => navigate({ to: "/" })} />;
}

export function LoginForm({
  initialMessage = "",
  onSuccess = async () => undefined,
}: {
  readonly initialMessage?: string;
  readonly onSuccess?: () => Promise<unknown>;
}) {
  const [message, setMessage] = useState(initialMessage);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const data = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
    });
    if (result.error) {
      console.log("Login Failed", result.error);
      setMessage("Sign-in was not accepted.");
      return;
    }
    await onSuccess();
  }
  return (
    <main className="flex flex-col justify-center gap-6 mx-auto px-6 py-16 max-w-md min-h-screen">
      <div>
        <p className="text-muted-foreground text-sm">
          SLGS private application
        </p>
        <h1 className="font-semibold text-3xl">Sign in to S.I.M.S.</h1>
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className="flex flex-col gap-2">
          Email
          <input
            className="bg-background px-3 py-2 border rounded-md"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
        </label>
        <label className="flex flex-col gap-2">
          Password
          <input
            className="bg-background px-3 py-2 border rounded-md"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
        {message ? <p role="alert">{message}</p> : null}
        <button
          className="bg-primary px-4 py-2 rounded-md text-primary-foreground"
          type="submit"
        >
          Sign in
        </button>
      </form>
    </main>
  );
}
