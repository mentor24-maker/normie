"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readAdminJson } from "@/lib/admin-fetch";
import { createBrowserClient } from "@/lib/supabase-browser";

type AuthMode = "login" | "register";

export function AdminLoginScreen() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams?.get("expired") === "1") {
      setError("Your admin session expired. Sign in again to continue.");
    }

    if (searchParams?.get("invite") === "1") {
      setMode("register");

      const invitedEmail = searchParams?.get("email")?.trim();

      if (invitedEmail) {
        setEmail(invitedEmail);
      }

      const inviteError = searchParams?.get("error");

      setError(
        inviteError === "wrong_account"
          ? "That sign-in did not match your invitation. Register below with the exact email that received the invite."
          : inviteError === "missing_tokens"
            ? "The invite link did not carry a sign-in token. Register below with the invited email (this is the reliable path)."
            : inviteError === "session_failed"
              ? "The invite link could not finish automatically. Register below with the invited email and a new password."
              : null
      );
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "register" && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await readAdminJson<{ user?: { id: string } }>(
        await fetch(mode === "login" ? "/api/admin/session" : "/api/admin/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : { email, password, fullName }
          )
        }),
        mode === "login" ? "Login failed." : "Registration failed."
      );

      window.location.assign("/admin/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : mode === "login"
            ? "Login failed."
            : "Registration failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);

    try {
      const supabase = createBrowserClient();
      const redirectTo = new URL("/admin/auth/callback", window.location.origin).toString();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : "Google sign-in failed.");
    }
  }

  return (
    <section className="admin-login-shell">
      <div className="admin-login-card">
        <div className="panel-label">Admin Login</div>
        <h2>
          {mode === "login"
            ? "Sign in to Normie Control Room"
            : searchParams?.get("invite") === "1"
              ? "Finish your team invitation"
              : "Create the first admin account"}
        </h2>
        <p className="page-copy admin-copy">
          {mode === "login"
            ? "Use your admin account to access builder tools, media, polls, users, and future backend modules."
            : searchParams?.get("invite") === "1"
              ? "Skip the email link. Enter the invited email, choose a password, and click Register Admin."
              : "Bootstrap the first admin account for this Normie install, then manage the rest of the team from inside the admin area."}
        </p>
        <div className="admin-auth-mode-toggle">
          <button
            className={`secondary-button ${mode === "login" ? "is-active-auth-mode" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={`secondary-button ${mode === "register" ? "is-active-auth-mode" : ""}`}
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            type="button"
          >
            Register
          </button>
        </div>
        <form className="import-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="field">
              <span>Full name</span>
              <input
                autoComplete="name"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your name"
              />
            </label>
          ) : null}
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
            />
          </label>
          {mode === "register" ? (
            <label className="field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
              />
            </label>
          ) : null}
          <button className="submit-button" disabled={isSubmitting} type="submit">
            {isSubmitting
              ? mode === "login"
                ? "Signing In..."
                : "Creating Account..."
              : mode === "login"
                ? "Sign In"
                : "Register Admin"}
          </button>
          {searchParams?.get("invite") !== "1" ? (
            <button className="secondary-button" onClick={() => void handleGoogleSignIn()} type="button">
              Continue with Google
            </button>
          ) : null}
          {error ? <div className="notice error admin-notice">{error}</div> : null}
        </form>
        <div className="admin-login-footer" aria-label="Legal links">
          <Link className="site-shell-footer-link" href="/privacy">
            Privacy Policy
          </Link>
          <Link className="site-shell-footer-link" href="/terms">
            Terms of Service
          </Link>
        </div>
      </div>
    </section>
  );
}
