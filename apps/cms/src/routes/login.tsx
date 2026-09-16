import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import {
  Button,
  Field,
  FieldError,
  FieldLabel,
  Input,
  PasswordInput,
} from "@slgs/ui";
import z from "zod";

const authClient = createAuthClient();

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  async function handleSubmit({
    value,
  }: {
    value: { email: string; password: string };
  }) {
    setMessage("");
    const result = await authClient.signIn.email({
      email: value.email,
      password: value.password,
    });
    if (result.error) {
      setMessage("Sign-in was not accepted.");
      return;
    }
    await navigate({ to: "/dashboard" });
  }

  return (
    <LoginForm application="CMS" message={message} onSubmit={handleSubmit} />
  );
}

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export function LoginForm(props: {
  application: string;
  message: string;
  onSubmit: (props: {
    value: { email: string; password: string };
  }) => void | Promise<void>;
}) {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: props.onSubmit,
    validators: {
      onBlur: loginSchema,
      onSubmit: loginSchema,
    },
  });

  return (
    <section className="home-hero">
      <main className="auth-card">
        <div className="mb-4 flex justify-center flex-col items-center">
          <img src="/favicon-96x96.png" alt="logo" width="64px" />
          <h1 className="text-3xl font-semibold">
            Sign in to {props.application}
          </h1>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            children={(field) => (
              <Field>
                <FieldLabel id={field.name} htmlFor={field.name}>
                  Email
                </FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="username"
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isDefaultValue &&
                  field.state.meta.isDirty && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
              </Field>
            )}
          />
          <form.Field
            name="password"
            children={(field) => (
              <Field>
                <FieldLabel id={field.name} htmlFor={field.name}>
                  Password
                </FieldLabel>
                <PasswordInput
                  id={field.name}
                  name={field.name}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {!field.state.meta.isDefaultValue &&
                  field.state.meta.isDirty && (
                    <FieldError errors={field.state.meta.errors} />
                  )}
              </Field>
            )}
          />
          {props.message ? <p role="alert">{props.message}</p> : null}
          <Button
            className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            type="submit"
          >
            Sign in
          </Button>
        </form>
      </main>
    </section>
  );
}
