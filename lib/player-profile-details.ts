import type { PlayerSocialLinks } from "@/lib/player-social-handles";

/** Client-safe profile shape for portal forms (no server-only imports). */
export type PlayerProfileDetails = {
  id: string;
  email: string;
  fullName: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  socialLinks: PlayerSocialLinks;
  shareProfile: boolean;
  sharePollResponses: boolean;
};
