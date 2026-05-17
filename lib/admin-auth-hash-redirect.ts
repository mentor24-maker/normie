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

export function shouldRouteAuthPayloadToAdminCallback(pathname: string, search: string, hash: string) {
  if (pathname === "/admin/auth/callback") {
    return false;
  }

  return hasAuthCallbackPayload(search, hash);
}
