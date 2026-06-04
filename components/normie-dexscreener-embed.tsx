"use client";

import { BuilderCodeEmbed } from "@/components/builder/builder-code-embed";
import { NORMIE_DEXSCREENER_EMBED_HTML } from "@/lib/normie-token";
import { sanitizeEmbedHtml } from "@/lib/sanitize-html";

const sanitizedDexscreenerHtml = sanitizeEmbedHtml(NORMIE_DEXSCREENER_EMBED_HTML);

export function NormieDexscreenerEmbed() {
  return (
    <div className="player-token-dexscreener-host">
      <BuilderCodeEmbed
        className="player-token-dexscreener-render"
        html={sanitizedDexscreenerHtml}
        requireActivation
      />
    </div>
  );
}
