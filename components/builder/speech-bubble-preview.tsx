import { formatRichTextContent, type BuilderTemplateModule } from "@/lib/builder-template";
import { getSpeechBubbleModuleStyle } from "./builder-utils";

type SpeechBubblePreviewProps = {
  classNamePrefix?: "builder-preview" | "builder-module-preview";
  module: BuilderTemplateModule;
};

export function SpeechBubblePreview({
  classNamePrefix = "builder-preview",
  module
}: SpeechBubblePreviewProps) {
  const bubbleStyle = getSpeechBubbleModuleStyle(module.settings);
  const contentHtml = formatRichTextContent(module.text) || "<p>What Normie has to say goes here.</p>";

  return (
    <div className={`${classNamePrefix}-speech-bubble`} style={bubbleStyle}>
      <div className={`${classNamePrefix}-speech-bubble-body`}>
        <div
          className={`${classNamePrefix}-speech-bubble-content`}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
        <span aria-hidden="true" className={`${classNamePrefix}-speech-bubble-tail`} />
      </div>
    </div>
  );
}
