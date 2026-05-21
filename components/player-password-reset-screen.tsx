"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

type ResetState = "checking" | "ready" | "success" | "error";

function createPlayerBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Player password reset is missing Supabase browser configuration.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

export function PlayerPasswordResetScreen() {
  const recoveryClientRef = useRef<ReturnType<typeof createPlayerBrowserClient> | null>(null);
  const [state, setState] = useState<ResetState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function claimRecoverySession() {
      try {
        const supabase = createPlayerBrowserClient();
        recoveryClientRef.current = supabase;
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = new URLSearchParams(window.location.search);
        const hashError = hashParams.get("error_description") || hashParams.get("error");

        if (hashError) {
          throw new Error(hashError);
        }

        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") || hashParams.get("type");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            throw sessionError;
          }
        } else if (tokenHash && type === "recovery") {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery"
          });

          if (otpError) {
            throw otpError;
          }
        } else {
          throw new Error("This reset link is missing its recovery token.");
        }

        setState("ready");
      } catch (claimError) {
        setError(claimError instanceof Error ? claimError.message : "This reset link could not be verified.");
        setState("error");
      }
    }

    void claimRecoverySession();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = recoveryClientRef.current ?? createPlayerBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      await supabase.auth.signOut();
      setState("success");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Password could not be updated.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="player-login-shell">
      <div className="player-login-card">
        <div className="panel-label">Player Portal</div>
        <h1>Reset your password.</h1>
        <p className="page-copy admin-copy">Choose a new password for your Normie player account.</p>

        {state === "checking" ? <div className="notice success player-inline-notice">Checking reset link...</div> : null}

        {state === "ready" ? (
          <form className="import-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                type="password"
                value={password}
              />
            </label>
            <label className="field">
              <span>Confirm new password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat new password"
                type="password"
                value={confirmPassword}
              />
            </label>
            <button className="submit-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : null}

        {state === "success" ? (
          <div className="notice success player-inline-notice">
            Password updated. <Link href="/portal">Return to login.</Link>
          </div>
        ) : null}

        {error ? <div className="notice error player-inline-notice">{error}</div> : null}
      </div>
    </section>
  );
}
