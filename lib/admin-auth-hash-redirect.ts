export function hasAuthCallbackPayload(search: string, hash: string) {
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search);

  if (hashParams.get("access_token") && hashParams.get("refresh_token")) {
    return true;
  }

  if (hashParams.get("error") || hashParams.get("error_description")) {
    return true;
  }

  if (searchParams.get("code") || searchParams.get("token_hash")) {
    return true;
  }

  return false;
}

export function buildAdminAuthCallbackPath(search: string, hash: string) {
  return `/admin/auth/callback${search}${hash}`;
}

export function buildPlayerPasswordResetPath(search: string, hash: string) {
  return `/portal/reset${search}${hash}`;
}

export function getAuthCallbackType(search: string, hash: string) {
  const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  const searchParams = new URLSearchParams(search);

  return hashParams.get("type") ?? searchParams.get("type");
}

export function isPlayerRecoveryPayload(search: string, hash: string) {
  return getAuthCallbackType(search, hash) === "recovery";
}

export function shouldRouteAuthPayloadToAdminCallback(pathname: string, search: string, hash: string) {
  if (pathname === "/admin/auth/callback" || pathname === "/portal/reset") {
    return false;
  }

  if (isPlayerRecoveryPayload(search, hash)) {
    return false;
  }

  return hasAuthCallbackPayload(search, hash);
}

export function shouldRouteAuthPayloadToPlayerReset(pathname: string, search: string, hash: string) {
  if (pathname === "/portal/reset" || pathname === "/admin/auth/callback") {
    return false;
  }

  return isPlayerRecoveryPayload(search, hash) && hasAuthCallbackPayload(search, hash);
}

/** Inline bootstrap for auth hash routing before React hydrates. */
export function buildAuthHashBootstrapScript() {
  return `(function(){var p=location.pathname;if(p==="/admin/auth/callback"||p==="/portal/reset")return;var h=location.hash;if(!h||h.length<=1)return;var x=new URLSearchParams(h.slice(1));var s=location.search;var y=new URLSearchParams(s);var t=x.get("type")||y.get("type");if(t==="recovery"){location.replace("/portal/reset"+s+h);return;}if((!x.get("access_token")||!x.get("refresh_token"))&&!x.get("error")&&!x.get("error_description")&&!y.get("code")&&!y.get("token_hash"))return;location.replace("/admin/auth/callback"+s+h);})();`;
}
