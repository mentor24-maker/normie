export type SiteSocialLink = {
  id: string;
  label: string;
  href: string;
  iconPath: string;
};

/** Matches the social row on normie.one home (header, upper right). */
export const siteHeaderSocialLinks: SiteSocialLink[] = [
  {
    id: "x",
    label: "X",
    href: "https://x.com/Normie765714",
    iconPath: "/gallery/social-x.svg"
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@PersonalityPolls",
    iconPath: "/gallery/social-youtube.svg"
  },
  {
    id: "telegram",
    label: "Telegram",
    href: "https://t.me/normieone",
    iconPath: "/gallery/social-telegram.svg"
  }
];
