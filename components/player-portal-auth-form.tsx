"use client";

import { formatRichTextContent } from "@/lib/builder-template";
import {
  clearPendingConfirmationEmail,
  readPendingConfirmationEmail,
  writePendingConfirmationEmail
} from "@/lib/player-pending-confirmation";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export type PlayerPortalAuthMode = "login" | "register";

export type PlayerPortalAuthSettings = {
  redirectPath: string;
  defaultMode: PlayerPortalAuthMode;
  showRegister: boolean;
  showForgotPassword: boolean;
};

const defaultPlayerPortalAuthSettings: PlayerPortalAuthSettings = {
  redirectPath: "/portal/dashboard",
  defaultMode: "login",
  showRegister: true,
  showForgotPassword: true
};

export function getPlayerPortalAuthSettings(settings: Record<string, string>): PlayerPortalAuthSettings {
  const defaultMode = settings.defaultMode === "register" ? "register" : "login";

  return {
    redirectPath: normalizeRedirectPath(settings.redirectPath),
    defaultMode,
    showRegister: settings.showRegister !== "false",
    showForgotPassword: settings.showForgotPassword !== "false"
  };
}

function normalizeRedirectPath(value: string | undefined): string {
  const trimmed = value?.trim() || defaultPlayerPortalAuthSettings.redirectPath;

  if (!trimmed.startsWith("/")) {
    return defaultPlayerPortalAuthSettings.redirectPath;
  }

  return trimmed;
}

type PlayerPortalAuthFormProps = {
  settings: PlayerPortalAuthSettings;
  heading?: string;
  previewMode?: boolean;
};

export function PlayerPortalAuthForm({ settings, heading = "", previewMode = false }: PlayerPortalAuthFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<PlayerPortalAuthMode>(settings.defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isResendingConfirmation, setIsResendingConfirmation] = useState(false);
  const [awaitingEmailConfirmation, setAwaitingEmailConfirmation] = useState(false);
  const headingHtml = formatRichTextContent(heading);

  useEffect(() => {
    if (previewMode) {
      return;
    }

    const pendingEmail = readPendingConfirmationEmail();

    if (!pendingEmail) {
      return;
    }

    setAwaitingEmailConfirmation(true);
    setEmail((current) => current || pendingEmail);
    setNotice("Check your email to confirm your account. Use Resend Confirmation Email if you need another link.");

    if (settings.showRegister) {
      setMode("register");
    }
  }, [previewMode, settings.showRegister]);

  useEffect(() => {
    if (!settings.showRegister) {
      setMode("login");
      return;
    }

    if (readPendingConfirmationEmail()) {
      return;
    }

    setMode(settings.defaultMode);
  }, [settings.defaultMode, settings.showRegister]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (previewMode) {
      return;
    }

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
      const data = (await response.json()) as {
        error?: string;
        needsEmailConfirmation?: boolean;
        message?: string;
      };

      if (!response.ok) {
        if (data.needsEmailConfirmation) {
          writePendingConfirmationEmail(email);
          setAwaitingEmailConfirmation(true);

          if (settings.showRegister) {
            setMode("register");
          }
        }

        throw new Error(data.error ?? (mode === "login" ? "Login failed." : "Registration failed."));
      }

      if (data.needsEmailConfirmation) {
        writePendingConfirmationEmail(email);
        setAwaitingEmailConfirmation(true);
        setNotice("Check your email to confirm your account. Use Resend Confirmation Email if you need another link.");
        return;
      }

      clearPendingConfirmationEmail();
      setAwaitingEmailConfirmation(false);
      router.push(settings.redirectPath);
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
    if (previewMode) {
      return;
    }

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

  async function handleResendConfirmation() {
    if (previewMode) {
      return;
    }

    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Enter your email above, then resend the confirmation link.");
      return;
    }

    setIsResendingConfirmation(true);

    try {
      const response = await postPlayerAuth("/api/player/resend-confirmation", { email });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Confirmation email could not be sent.");
      }

      writePendingConfirmationEmail(email);
      setAwaitingEmailConfirmation(true);
      setNotice(data.message ?? "If that email is waiting for confirmation, a new confirmation link has been sent.");
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : "Confirmation email could not be sent.");
    } finally {
      setIsResendingConfirmation(false);
    }
  }

  const fieldDisabled = previewMode;

  return (
    <section
      className="player-login-shell"
      onClick={previewMode ? (event) => event.stopPropagation() : undefined}
      onKeyDown={previewMode ? (event) => event.stopPropagation() : undefined}
    >
      <div className="player-login-card">
        <div className="panel-label">Player Portal</div>
        {headingHtml ? (
          <div
            className="player-portal-heading"
            dangerouslySetInnerHTML={{ __html: headingHtml }}
          />
        ) : (
          <h2 className="player-portal-title">
            {mode === "register" ? "Create your player account" : "Sign in to Normie"}
          </h2>
        )}
        {settings.showRegister ? (
          <div className="player-portal-mode-toggle admin-auth-mode-toggle">
            <button
              className={`secondary-button ${mode === "login" ? "is-active-auth-mode" : ""}`}
              disabled={fieldDisabled}
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
              disabled={fieldDisabled}
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
        ) : null}
        <form className="import-form" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <>
              <label className="field">
                <span>Display name</span>
                <input
                  autoComplete="name"
                  disabled={fieldDisabled}
                  name="name"
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
                  disabled={fieldDisabled}
                  name="nickname"
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
              autoComplete="username"
              disabled={fieldDisabled}
              name="username"
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
              disabled={fieldDisabled}
              name={mode === "login" ? "current-password" : "new-password"}
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
                disabled={fieldDisabled}
                name="confirm-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                type="password"
                value={confirmPassword}
              />
            </label>
          ) : null}
          <div className="player-auth-action-row">
            <button
              className={`submit-button ${mode === "register" ? "player-register-button" : ""}`}
              disabled={fieldDisabled || isSubmitting}
              type="submit"
            >
              {previewMode
                ? mode === "login"
                  ? "Sign In"
                  : "Register Player"
                : isSubmitting
                  ? mode === "login"
                    ? "Signing In..."
                    : "Creating Profile..."
                  : mode === "login"
                    ? "Sign In"
                    : "Register Player"}
            </button>
            {mode === "login" && settings.showForgotPassword ? (
              <button
                className="text-button player-forgot-password-button"
                disabled={fieldDisabled || isSendingReset}
                onClick={handlePasswordReset}
                type="button"
              >
                {isSendingReset ? "Sending reset link..." : "Forgot password?"}
              </button>
            ) : null}
            {mode === "register" && awaitingEmailConfirmation ? (
              <button
                className="text-button player-forgot-password-button"
                disabled={fieldDisabled || isResendingConfirmation}
                onClick={handleResendConfirmation}
                type="button"
              >
                {isResendingConfirmation ? "Sending confirmation email..." : "Resend Confirmation Email"}
              </button>
            ) : null}
          </div>
          {previewMode ? (
            <div className="notice success player-inline-notice">
              Live login and registration run on published pages and in page preview.
            </div>
          ) : null}
          {notice ? <div className="notice success player-inline-notice">{notice}</div> : null}
          {error ? <div className="notice error player-inline-notice">{error}</div> : null}
        </form>
      </div>
    </section>
  );
}
