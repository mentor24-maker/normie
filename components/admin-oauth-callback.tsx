"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase-browser";

export function AdminOauthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finishOauth() {
      try {
        const supabase = createBrowserClient();
        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          for (let attempt = 0; attempt < 8 && !session; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            session = (await supabase.auth.getSession()).data.session;
          }
        }

        if (!session) {
          throw new Error("Google sign-in did not complete. Please try again.");
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
          throw new Error(data.error ?? "Failed to complete Google sign-in.");
        }

        router.push("/admin/dashboard");
        router.refresh();
      } catch (callbackError) {
        setError(callbackError instanceof Error ? callbackError.message : "Google sign-in failed.");
      }
    }

    void finishOauth();
  }, [router]);

  return (
    <section className="admin-login-shell">
      <div className="admin-login-card">
        <div className="panel-label">Google Login</div>
        <h2>{error ? "Sign-in failed" : "Finishing sign-in..."}</h2>
        <p className="page-copy admin-copy">
          {error ?? "We’re completing your Google OAuth session and sending you into the admin area."}
        </p>
      </div>
    </section>
  );
}
