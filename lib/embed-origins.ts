/** Origins allowed in CSP `frame-src` for builder videos and blog embeds. */
export const TRUSTED_EMBED_FRAME_ORIGINS = [
  "https://www.youtube.com",
  "https://youtube.com",
  "https://www.youtube-nocookie.com",
  "https://youtube-nocookie.com",
  "https://player.vimeo.com",
  "https://vimeo.com",
  "https://platform.twitter.com"
] as const;
