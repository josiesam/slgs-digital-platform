import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition, type FormEvent } from "react";
import {
  changeSignedInUserPassword,
  getSignedInUserProfile,
  requestSignedInUserPasswordReset,
  updateSignedInUserProfile,
} from "../../../profile-functions";
import {
  Avatar,
  AvatarFallback,
  Button,
  Field,
  FieldLabel,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@slgs/ui";
import {
  IconEye,
  IconEyeOff,
  IconKey,
  IconMail,
  IconShield,
  IconUserCheck,
} from "@tabler/icons-react";

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  loader: () => getSignedInUserProfile(),
  component: ProfilePage,
});

function ProfilePage() {
  const initialData = Route.useLoaderData();
  const [profileData, setProfileData] = useState(initialData);

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [resetMessage, setResetMessage] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [pending, startTransition] = useTransition();

  const handleUpdateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage("");
    setProfileError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();

    if (!name) {
      setProfileError("Display name cannot be empty.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await updateSignedInUserProfile({ data: { name } });
        if (res.success) {
          setProfileData((prev) => ({
            ...prev,
            user: { ...prev.user, name: res.name },
          }));
          setProfileMessage("Profile updated successfully!");
        }
      } catch (err: unknown) {
        const error = err as Error;
        setProfileError(error.message || "Failed to update profile.");
      }
    });
  };

  const handleChangePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await changeSignedInUserPassword({
          data: { currentPassword, newPassword },
        });
        if (res.success) {
          setPasswordMessage("Password changed successfully!");
          (event.target as HTMLFormElement).reset();
        }
      } catch (err: unknown) {
        const error = err as Error;
        setPasswordError(error.message || "Failed to change password.");
      }
    });
  };

  const handleResetPassword = () => {
    setResetMessage("");
    startTransition(async () => {
      try {
        const res = await requestSignedInUserPasswordReset();
        setResetMessage(res.message);
      } catch {
        setResetMessage("Failed to initiate password reset.");
      }
    });
  };

  const user = profileData.user;
  const initials =
    user.name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CU";

  return (
    <div className="max-w-4xl space-y-8 p-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b">
        <Avatar className="h-16 w-16 rounded-xl border border-border shadow-sm">
          <AvatarFallback className="rounded-xl bg-[#42245f] text-white text-xl font-bold font-serif">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="font-bold text-2xl tracking-tight">{user.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <IconMail className="size-3.5" />
              {user.email}
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium border border-border">
              {user.role}
            </span>
            <span>•</span>
            <span className="capitalize font-medium text-emerald-600 dark:text-emerald-400">
              {user.status}
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Profile Settings Section */}
        <section
          aria-labelledby="profile-settings"
          className="space-y-4 bg-card shadow-sm p-6 border rounded-xl"
        >
          <div className="flex items-center gap-2 border-b pb-3">
            <IconUserCheck className="size-5 text-primary" />
            <h2 id="profile-settings" className="font-semibold text-lg">
              Profile Information
            </h2>
          </div>

          {profileMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 p-3 rounded-lg text-xs font-medium">
              {profileMessage}
            </div>
          )}

          {profileError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs font-medium">
              {profileError}
            </div>
          )}

          <form className="space-y-4 text-xs" onSubmit={handleUpdateProfile}>
            <div className="space-y-1">
              <label className="font-medium text-foreground" htmlFor="name">
                Display Name
              </label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                maxLength={160}
                className="w-full"
              />
            </div>

            <div className="space-y-1">
              <label
                className="font-medium text-muted-foreground"
                htmlFor="email"
              >
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                value={user.email}
                disabled
                className="w-full bg-muted cursor-not-allowed opacity-75"
              />
              <p className="text-[11px] text-muted-foreground">
                Email address is assigned to your institution membership.
              </p>
            </div>

            <Button
              disabled={pending}
              type="submit"
              className="w-full font-semibold"
            >
              Save Profile Changes
            </Button>
          </form>
        </section>

        {/* Security & Password Section */}
        <section
          aria-labelledby="password-security"
          className="space-y-4 bg-card shadow-sm p-6 border rounded-xl"
        >
          <div className="flex items-center gap-2 border-b pb-3">
            <IconKey className="size-5 text-primary" />
            <h2 id="password-security" className="font-semibold text-lg">
              Password & Security
            </h2>
          </div>

          {passwordMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200 p-3 rounded-lg text-xs font-medium">
              {passwordMessage}
            </div>
          )}

          {passwordError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-xs font-medium">
              {passwordError}
            </div>
          )}

          <form className="space-y-3 text-xs" onSubmit={handleChangePassword}>
            <Field>
              <FieldLabel htmlFor="currentPassword">
                Current Password
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="Enter current password"
                />
                <InputGroupAddon
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  align="inline-end"
                >
                  {showCurrentPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  required
                  placeholder="At least 8 characters"
                />
                <InputGroupAddon
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  align="inline-end"
                >
                  {showNewPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="confirmPassword">
                Confirm New Password
              </FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  minLength={8}
                  maxLength={128}
                  required
                  placeholder="Confirm new password"
                />
                <InputGroupAddon
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  align="inline-end"
                >
                  {showConfirmPassword ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            </Field>

            <Button
              disabled={pending}
              type="submit"
              variant="secondary"
              className="w-full font-semibold"
            >
              Change Password
            </Button>
          </form>

          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <IconShield className="size-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Reset Password</h3>
            </div>
            <p className="text-muted-foreground text-xs">
              Need to reset your password via email link? Trigger a secure reset
              request for your account.
            </p>
            {resetMessage && (
              <div className="bg-accent p-3 rounded-lg text-xs font-medium text-accent-foreground">
                {resetMessage}
              </div>
            )}
            <Button
              disabled={pending}
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              className="w-full"
            >
              Send Password Reset Link
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
