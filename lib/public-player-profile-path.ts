/** Client-safe URL helper (no server-only imports). */

export function getPublicPlayerProfilePath(handle: string): string {
  const normalized = String(handle ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  return normalized ? `/players/${encodeURIComponent(normalized)}` : "/players";
}
