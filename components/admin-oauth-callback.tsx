"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCallbackAuthParams } from "@/lib/admin-auth-callback-client";
import { getAdminInviteSetupUrl } from "@/lib/site-url";
import { createBrowserClient } from "@/lib/supabase-browser";

export function AdminOauthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finishAuthCallback() {
      try {
        const supabase = createBrowserClient();
        const params = getCallbackAuthParams();
        const searchParams = new URLSearchParams(window.location.search);
        const tokenHash = searchParams.get("token_hash");
        const otpType = searchParams.get("type");

        if (params.authError) {
          throw new Error(params.authError);
        }

        if (tokenHash && otpType) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType as "invite" | "signup" | "recovery" | "email"
          });

          if (verifyError) {
            throw verifyError;
          }
        } else if (params.hasInviteTokens) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.accessToken!,
            refresh_token: params.refreshToken!
          });

          if (sessionError) {
            throw sessionError;
          }
        } else if (params.hasPkceCode) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code!);

          if (exchangeError) {
            throw exchangeError;
          }
        }

        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          for (let attempt = 0; attempt < 8 && !session; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            session = (await supabase.auth.getSession()).data.session;
          }
        }

        if (!session) {
          const setupUrl = new URL(getAdminInviteSetupUrl());
          setupUrl.searchParams.set(
            "error",
            params.hasInviteTokens || tokenHash ? "session_failed" : "missing_tokens"
          );
          router.replace(setupUrl.toString());
          return;
        }

        const response = await fetch("/api/admin/session/oauth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          })
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          await supabase.auth.signOut();

          const setupUrl = new URL(getAdminInviteSetupUrl());

          if (session.user.email) {
            setupUrl.searchParams.set("email", session.user.email);
          }

          if (response.status === 403) {
            setupUrl.searchParams.set("error", "wrong_account");
            router.replace(setupUrl.toString());
            return;
          }

          setupUrl.searchParams.set("error", "session_failed");
          router.replace(setupUrl.toString());
          return;
        }

        window.history.replaceState({}, document.title, window.location.pathname);
        router.push("/admin/dashboard");
        router.refresh();
      } catch (callbackError) {
        const message =
          callbackError instanceof Error ? callbackError.message : "Admin sign-in failed.";
        setError(message);

        const setupUrl = new URL(getAdminInviteSetupUrl());
        setupUrl.searchParams.set("error", "session_failed");
        setTimeout(() => {
          router.replace(setupUrl.toString());
        }, 4000);
      }
    }

    void finishAuthCallback();
  }, [router]);

  return (
    <section className="admin-login-shell">
      <div className="admin-login-card">
        <div className="panel-label">Admin Access</div>
        <h2>{error ? "Sign-in failed" : "Finishing sign-in..."}</h2>
        <p className="page-copy admin-copy">
          {error ??
            "We're completing your invitation and sending you into the admin area."}
        </p>
        {error ? (
          <p className="page-copy admin-copy">
            Redirecting you to the password setup page in a few seconds. If nothing happens, open{" "}
            <a href={getAdminInviteSetupUrl()}>{getAdminInviteSetupUrl()}</a> and use{" "}
            <strong>Register</strong> with the email that received the invite.
          </p>
        ) : null}
      </div>
    </section>
  );
}
