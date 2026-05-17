export type CallbackAuthType = "invite" | "recovery" | "signup" | "magiclink" | "email" | null;

export function getCallbackAuthParams() {
  const hash =
    typeof window !== "undefined" && window.location.hash.length > 1
      ? new URLSearchParams(window.location.hash.slice(1))
      : new URLSearchParams();
  const search =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const authType = (hash.get("type") ?? search.get("type")) as CallbackAuthType;
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const code = search.get("code");
  const authError = hash.get("error_description") ?? hash.get("error") ?? search.get("error_description") ?? search.get("error");

  return {
    authType,
    accessToken,
    refreshToken,
    code,
    authError,
    hasInviteTokens: Boolean(accessToken && refreshToken),
    hasPkceCode: Boolean(code)
  };
}

export function isInviteLikeCallback(authType: CallbackAuthType) {
  return authType === "invite" || authType === "recovery" || authType === "signup";
}
