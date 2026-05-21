"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

export function PlayerLoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  async function postPlayerAuth(path: string, payload: Record<string, string>) {
    try {
      return await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload)
      });
    } catch (fetchError) {
      throw new Error(
        fetchError instanceof Error && fetchError.message === "Failed to fetch"
          ? `The browser could not reach ${path}. Refresh the page and try again.`
          : fetchError instanceof Error
            ? fetchError.message
            : "The browser could not reach the Player Portal API."
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      if (mode === "register" && password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const response = await postPlayerAuth(
        mode === "login" ? "/api/player/session" : "/api/player/register",
        mode === "login" ? { email, password } : { email, password, fullName, handle }
      );
      const data = (await response.json()) as { error?: string; needsEmailConfirmation?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? (mode === "login" ? "Login failed." : "Registration failed."));
      }

      if (data.needsEmailConfirmation) {
        setNotice("Check your email to confirm the account, then sign in here.");
        setMode("login");
        return;
      }

      router.push("/portal/dashboard");
      router.refresh();
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

  async function handlePasswordReset() {
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Enter your email above, then request a reset link.");
      return;
    }

    setIsSendingReset(true);

    try {
      const response = await postPlayerAuth("/api/player/password-reset", { email });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Reset link could not be sent.");
      }

      setNotice(data.message ?? "If that email has a player account, a reset link has been sent.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset link could not be sent.");
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <section className="player-login-shell">
      <div className="player-login-card">
        <div className="panel-label">Player Portal</div>
        <h1>{mode === "login" ? "Jump back into Normie." : "Create your player profile."}</h1>
        <p className="page-copy admin-copy">
          Track every poll you answer, build your token count, and see where you stand on the leaderboard.
        </p>
        <div className="admin-auth-mode-toggle">
          <button
            className={`secondary-button ${mode === "login" ? "is-active-auth-mode" : ""}`}
            onClick={() => {
              setMode("login");
              setError(null);
              setNotice(null);
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
              setNotice(null);
            }}
            type="button"
          >
            Register
          </button>
        </div>
        <form className="import-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="field">
                <span>Display name</span>
                <input
                  autoComplete="name"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                  type="text"
                  value={fullName}
                />
              </label>
              <label className="field">
                <span>Handle</span>
                <input
                  autoComplete="nickname"
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="normie_player"
                  type="text"
                  value={handle}
                />
              </label>
            </>
          ) : null}
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              type="password"
              value={password}
            />
          </label>
          {mode === "register" ? (
            <label className="field">
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}
          <button
            className={`submit-button ${mode === "register" ? "player-register-button" : ""}`}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? mode === "login"
                ? "Signing In..."
                : "Creating Profile..."
              : mode === "login"
                ? "Sign In"
                : "Register Player"}
          </button>
          {mode === "login" ? (
            <button
              className="text-button player-forgot-password-button"
              disabled={isSendingReset}
              onClick={handlePasswordReset}
              type="button"
            >
              {isSendingReset ? "Sending reset link..." : "Forgot password?"}
            </button>
          ) : null}
          {notice ? <div className="notice success player-inline-notice">{notice}</div> : null}
          {error ? <div className="notice error player-inline-notice">{error}</div> : null}
        </form>
      </div>
    </section>
  );
}
