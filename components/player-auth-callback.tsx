"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import logoBanner from "@/images/logo_normie_3_1600x500.png";

function createPlayerCallbackClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Player confirmation is missing Supabase browser configuration.");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  });
}

export function PlayerAuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finishPlayerConfirmation() {
      try {
        const supabase = createPlayerCallbackClient();
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = new URLSearchParams(window.location.search);
        const authError = hashParams.get("error_description") || hashParams.get("error");

        if (authError) {
          throw new Error(authError);
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
        } else if (tokenHash && (type === "signup" || type === "email")) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type
          });

          if (otpError) {
            throw otpError;
          }
        } else {
          throw new Error("This confirmation link is missing its sign-in token.");
        }

        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          for (let attempt = 0; attempt < 8 && !session; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
            session = (await supabase.auth.getSession()).data.session;
          }
        }

        if (!session) {
          throw new Error("This confirmation link could not create a player session.");
        }

        const response = await fetch("/api/player/session/oauth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            accessToken: session.access_token,
            refreshToken: session.refresh_token
          })
        });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Player confirmation failed.");
        }

        await supabase.auth.signOut();
        window.history.replaceState({}, document.title, window.location.pathname);
        router.push("/portal/dashboard");
        router.refresh();
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : "Player confirmation failed.");
      }
    }

    void finishPlayerConfirmation();
  }, [router]);

  return (
    <section className="player-login-shell">
      <div className="player-login-card player-auth-callback-card">
        <Image
          alt="Normie"
          className="player-auth-callback-logo"
          priority
          src={logoBanner}
        />
        <div className="panel-label">Player Portal</div>
        <h1 className="player-auth-callback-title">
          {error ? "Confirmation failed" : "Finishing your player account..."}
        </h1>
        <p className="page-copy admin-copy">
          {error ?? "We're confirming your email and taking you to your player dashboard."}
        </p>
        {error ? (
          <p className="page-copy admin-copy">
            <Link href="/portal">Return to Player Portal login.</Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
