import { safePlayerText } from "@/lib/player-auth";

export type PlayerSocialLinks = {
  website: string;
  x: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  discord: string;
};

export const EMPTY_PLAYER_SOCIAL_LINKS: PlayerSocialLinks = {
  website: "",
  x: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  discord: ""
};

export type PlayerSocialFieldKey = keyof PlayerSocialLinks;

export type PlayerSocialFieldConfig = {
  key: PlayerSocialFieldKey;
  label: string;
  prefix: string;
  placeholder: string;
  handleOnly?: boolean;
};

/** Gallery icons for public profile / connect UI (keys without an icon use a letter fallback). */
export const PLAYER_SOCIAL_ICON_PATHS: Partial<Record<PlayerSocialFieldKey, string>> = {
  x: "/gallery/social-x.svg",
  youtube: "/gallery/social-youtube.svg",
  tiktok: "/gallery/social-tiktok.svg"
};

export const PLAYER_SOCIAL_FIELD_CONFIG: PlayerSocialFieldConfig[] = [
  { key: "website", label: "Website", prefix: "https://", placeholder: "yoursite.com" },
  { key: "x", label: "X", prefix: "x.com/", placeholder: "handle" },
  { key: "instagram", label: "Instagram", prefix: "instagram.com/", placeholder: "handle" },
  { key: "tiktok", label: "TikTok", prefix: "tiktok.com/@", placeholder: "handle" },
  { key: "youtube", label: "YouTube", prefix: "youtube.com/@", placeholder: "handle" },
  { key: "discord", label: "Discord", prefix: "", placeholder: "username", handleOnly: true }
];

function stripLeadingSlash(value: string) {
  return value.replace(/^\/+/, "");
}

function stripAtPrefix(value: string) {
  return value.replace(/^@+/, "");
}

function stripKnownPrefixes(value: string, prefixes: string[]) {
  let candidate = value.trim();

  for (const prefix of prefixes) {
    const lowerCandidate = candidate.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();

    if (lowerCandidate.startsWith(lowerPrefix)) {
      candidate = candidate.slice(prefix.length);
      break;
    }
  }

  return stripAtPrefix(stripLeadingSlash(candidate));
}

export function socialLinkToHandle(key: PlayerSocialFieldKey, stored: string): string {
  const value = safePlayerText(stored, 500);

  if (!value) {
    return "";
  }

  switch (key) {
    case "website":
      return stripKnownPrefixes(value, ["https://", "http://"]);
    case "x":
      return stripKnownPrefixes(value, [
        "https://x.com/",
        "http://x.com/",
        "https://twitter.com/",
        "http://twitter.com/",
        "x.com/",
        "twitter.com/"
      ]);
    case "instagram":
      return stripKnownPrefixes(value, [
        "https://instagram.com/",
        "http://instagram.com/",
        "https://www.instagram.com/",
        "http://www.instagram.com/",
        "instagram.com/",
        "www.instagram.com/"
      ]);
    case "tiktok":
      return stripKnownPrefixes(value, [
        "https://tiktok.com/@",
        "http://tiktok.com/@",
        "https://www.tiktok.com/@",
        "http://www.tiktok.com/@",
        "tiktok.com/@",
        "www.tiktok.com/@",
        "https://tiktok.com/",
        "http://tiktok.com/",
        "tiktok.com/",
        "www.tiktok.com/"
      ]);
    case "youtube":
      return stripKnownPrefixes(value, [
        "https://youtube.com/@",
        "http://youtube.com/@",
        "https://www.youtube.com/@",
        "http://www.youtube.com/@",
        "youtube.com/@",
        "www.youtube.com/@",
        "https://youtube.com/",
        "http://youtube.com/",
        "youtube.com/",
        "www.youtube.com/"
      ]);
    case "discord":
      return stripKnownPrefixes(value, [
        "https://discord.com/users/",
        "http://discord.com/users/",
        "discord.com/users/",
        "https://discord.gg/",
        "http://discord.gg/",
        "discord.gg/"
      ]);
    default:
      return value;
  }
}

export function socialHandlesFromLinks(links: PlayerSocialLinks): PlayerSocialLinks {
  return {
    website: socialLinkToHandle("website", links.website),
    x: socialLinkToHandle("x", links.x),
    instagram: socialLinkToHandle("instagram", links.instagram),
    tiktok: socialLinkToHandle("tiktok", links.tiktok),
    youtube: socialLinkToHandle("youtube", links.youtube),
    discord: socialLinkToHandle("discord", links.discord)
  };
}

function normalizeWebsiteHandle(handle: string) {
  const trimmed = safePlayerText(handle, 500);

  if (!trimmed) {
    return "";
  }

  const withoutProtocol = stripKnownPrefixes(trimmed, ["https://", "http://"]);

  return `https://${withoutProtocol}`;
}

export function handleToSocialLink(key: PlayerSocialFieldKey, handle: string): string {
  const trimmed = stripAtPrefix(stripLeadingSlash(safePlayerText(handle, 500)));

  if (!trimmed) {
    return "";
  }

  switch (key) {
    case "website":
      return normalizeWebsiteHandle(trimmed);
    case "x":
      return `https://x.com/${trimmed}`;
    case "instagram":
      return `https://instagram.com/${trimmed}`;
    case "tiktok":
      return `https://tiktok.com/@${trimmed}`;
    case "youtube":
      return `https://youtube.com/@${trimmed}`;
    case "discord":
      return trimmed;
    default:
      return trimmed;
  }
}

export function socialLinksFromHandles(handles: PlayerSocialLinks): PlayerSocialLinks {
  return {
    website: handleToSocialLink("website", handles.website),
    x: handleToSocialLink("x", handles.x),
    instagram: handleToSocialLink("instagram", handles.instagram),
    tiktok: handleToSocialLink("tiktok", handles.tiktok),
    youtube: handleToSocialLink("youtube", handles.youtube),
    discord: handleToSocialLink("discord", handles.discord)
  };
}
