import type {
  BackgroundSettings,
  BuilderPageRecord,
  BuilderTemplateLayout,
  BuilderTemplateKind,
  BuilderTemplateModuleType,
  BuilderTemplateRecord
} from "@/lib/builder-template";
import type { BuilderEmailFunction } from "@/lib/builder-email-template";

export type ModulePaletteGroup = BuilderTemplateModuleType | "special-effects";

export type GalleryTarget =
  | { kind: "module"; sectionId: string; moduleId: string }
  | { kind: "button-background"; sectionId: string; moduleId: string }
  | { kind: "section-background"; sectionId: string }
  | { kind: "social-icon"; sectionId: string; moduleId: string; itemId: string };

export type ModulePaletteItem = {
  id: string;
  type: BuilderTemplateModuleType;
  group: ModulePaletteGroup;
  label: string;
  icon: string;
  description: string;
  name: string;
  text: string;
  settings?: Record<string, string>;
};

export type BuilderDraft = {
  id: string;
  name: string;
  templateKind: BuilderTemplateKind;
  emailFunction: BuilderEmailFunction | "";
  pageBackground: BackgroundSettings;
  layoutSections: import("@/lib/builder-template").BuilderTemplateSection[];
};

export const layoutOptions: Array<{ value: BuilderTemplateLayout; label: string }> = [
  { value: "single", label: "Single Column" },
  { value: "two-column", label: "Two Column" },
  { value: "three-column", label: "Three Column" },
  { value: "two-four", label: "2 / 4 Split" },
  { value: "four-two", label: "4 / 2 Split" },
  { value: "one-five", label: "1 / 5 Split" },
  { value: "five-one", label: "5 / 1 Split" }
];

export const modulePaletteGroups: Array<{
  value: ModulePaletteGroup;
  label: string;
  icon: string;
  description: string;
}> = [
  { value: "navigation", label: "Navigation", icon: "≡", description: "Menus, link bars, and top navigation." },
  { value: "heading", label: "Headings", icon: "H", description: "Titles, labels, and section headers." },
  { value: "headline-rotator", label: "Headline Rotator", icon: "↻", description: "Cycles through a list of headlines with a fade transition." },
  { value: "text", label: "Text", icon: "T", description: "Paragraphs, intros, and supporting copy." },
  { value: "code", label: "Code", icon: "</>", description: "Embed codes, widgets, and raw HTML snippets." },
  { value: "merch", label: "Merch", icon: "$", description: "Product cards from the shop catalog or custom URLs." },
  { value: "image", label: "Image", icon: "I", description: "Images, logos, and visual media." },
  { value: "floating-image", label: "Floating Image", icon: "✦", description: "Absolutely positioned images that float over the layout." },
  { value: "video", label: "Video", icon: "V", description: "Embeddable videos from YouTube, Vimeo, or uploaded files." },
  { value: "quote", label: "Quote", icon: "Q", description: "Pull quotes, testimonials, and callouts." },
  { value: "button", label: "Buttons", icon: "B", description: "Calls to action and navigation links." },
  { value: "contact-form", label: "Contact Forms", icon: "CF", description: "Lead capture forms with simple presets." },
  { value: "player-portal", label: "Player Portal", icon: "PP", description: "Player login and registration on any page." },
  { value: "previous-results", label: "Previous Results", icon: "PR", description: "Only the live previous-poll results panel." },
  { value: "current-poll", label: "Polls", icon: "P?", description: "The current live poll with vote actions." },
  { value: "social-share", label: "Social Share", icon: "↗", description: "Share buttons with dynamic post text from the current poll." },
  { value: "social", label: "Social", icon: "@", description: "Linked rows of social icons and profile badges." },
  { value: "table", label: "Tables", icon: "⊞", description: "Data tables with configurable columns and rows." },
  { value: "slider", label: "Sliders", icon: "⇆", description: "Horizontally scrollable bars of managed cards." },
  {
    value: "special-effects",
    label: "Special Effects",
    icon: "🪄",
    description: "Celebration bursts and other scripted visual effects."
  }
];

export const modulePaletteItems: ModulePaletteItem[] = [
  {
    id: "navigation-site-menu",
    type: "navigation",
    group: "navigation",
    label: "Top Menu",
    icon: "≡",
    description: "The main site navigation menu used across the public pages.",
    name: "",
    text: "",
    settings: { variant: "site-nav" }
  },
  {
    id: "heading-eyebrow",
    type: "heading",
    group: "heading",
    label: "Eyebrow",
    icon: "Ey",
    description: "Small label above a larger message.",
    name: "",
    text: "",
    settings: {
      variant: "eyebrow",
      level: "h6",
      fontSize: "14",
      bold: "true",
      marginTop: "0",
      marginBottom: "0"
    }
  },
  {
    id: "heading-section",
    type: "heading",
    group: "heading",
    label: "Section Heading",
    icon: "H2",
    description: "Primary heading for a pod or section.",
    name: "",
    text: "",
    settings: { variant: "section", level: "h2", fontSize: "32", bold: "true" }
  },
  {
    id: "heading-hero",
    type: "heading",
    group: "heading",
    label: "Hero Title",
    icon: "H1",
    description: "Large, high-impact headline treatment.",
    name: "",
    text: "",
    settings: { variant: "hero", level: "h1", fontSize: "56", bold: "true" }
  },
  {
    id: "headline-rotator-default",
    type: "headline-rotator",
    group: "headline-rotator",
    label: "Headline Rotator",
    icon: "↻",
    description: "Cycles through headlines with a fade transition.",
    name: "",
    text: "",
    settings: {
      fontSize: "32",
      color: "#18324a",
      bold: "true",
      alignment: "center",
      verticalAlignment: "top",
      minHeight: "480",
      fadeDuration: "800",
      displaySpeed: "3000",
      headlines: JSON.stringify([])
    }
  },
  {
    id: "text-paragraph",
    type: "text",
    group: "text",
    label: "Paragraph",
    icon: "P",
    description: "Standard body copy block.",
    name: "",
    text: "",
    settings: { variant: "paragraph" }
  },
  {
    id: "text-intro",
    type: "text",
    group: "text",
    label: "Intro Copy",
    icon: "In",
    description: "Slightly larger intro or lead copy.",
    name: "",
    text: "",
    settings: { variant: "intro" }
  },
  {
    id: "text-caption",
    type: "text",
    group: "text",
    label: "Caption",
    icon: "Cp",
    description: "Smaller utility or supporting note.",
    name: "",
    text: "",
    settings: { variant: "caption" }
  },
  {
    id: "code-embed",
    type: "code",
    group: "code",
    label: "Code",
    icon: "</>",
    description: "Raw embed code or HTML snippet.",
    name: "",
    text: "",
    settings: { variant: "embed", label: "", snippetMode: "html" }
  },
  {
    id: "merch-product-card",
    type: "merch",
    group: "merch",
    label: "Merch",
    icon: "$",
    description: "Redbubble product card generated from a product URL.",
    name: "",
    text: "",
    settings: { variant: "product-card", productId: "", productUrl: "", productName: "", imageUrl: "", buttonLabel: "Buy on Redbubble" }
  },
  {
    id: "image-standard",
    type: "image",
    group: "image",
    label: "Image",
    icon: "Img",
    description: "Standard image block with caption support.",
    name: "",
    text: "",
    settings: { variant: "image", url: "", alt: "" }
  },
  {
    id: "image-logo",
    type: "image",
    group: "image",
    label: "Logo",
    icon: "Lg",
    description: "Compact brand or partner mark.",
    name: "",
    text: "",
    settings: { variant: "logo", url: "", alt: "" }
  },
  {
    id: "floating-image-decor",
    type: "floating-image",
    group: "floating-image",
    label: "Floating Image",
    icon: "✦",
    description: "Decorative image positioned over other content without affecting layout height.",
    name: "",
    text: "",
    settings: { variant: "decor", url: "", alt: "", size: "15", overlayAnchor: "center", zIndex: "20", effect: "bounce" }
  },
  {
    id: "image-video",
    type: "video",
    group: "video",
    label: "Video",
    icon: "Vid",
    description: "Embedded video with name and description.",
    name: "",
    text: "",
    settings: { variant: "embed", url: "", videoName: "", videoDescription: "" }
  },
  {
    id: "quote-pull",
    type: "quote",
    group: "quote",
    label: "Pull Quote",
    icon: "Qt",
    description: "Stylized editorial quotation.",
    name: "",
    text: "",
    settings: { variant: "pull" }
  },
  {
    id: "quote-testimonial",
    type: "quote",
    group: "quote",
    label: "Testimonial",
    icon: "Tm",
    description: "Customer or audience endorsement.",
    name: "",
    text: "",
    settings: { variant: "testimonial" }
  },
  {
    id: "quote-stat",
    type: "quote",
    group: "quote",
    label: "Stat Callout",
    icon: "St",
    description: "Short statistic or proof point.",
    name: "",
    text: "",
    settings: { variant: "stat" }
  },
  {
    id: "button-primary",
    type: "button",
    group: "button",
    label: "Primary CTA",
    icon: "Go",
    description: "Main call to action button.",
    name: "",
    text: "",
    settings: { variant: "primary", href: "", buttonColor: "#214c71", buttonHoverColor: "#0f4f8f", textColor: "#ffffff", textHoverColor: "#ffffff", borderColor: "#214c71", paddingX: "24", paddingY: "12" }
  },
  {
    id: "button-secondary",
    type: "button",
    group: "button",
    label: "Secondary CTA",
    icon: "Alt",
    description: "Lower emphasis alternate action.",
    name: "",
    text: "",
    settings: { variant: "secondary", href: "", buttonColor: "transparent", buttonHoverColor: "#eaf4ff", textColor: "#214c71", textHoverColor: "#0f4f8f", borderColor: "#214c71", paddingX: "24", paddingY: "12" }
  },
  {
    id: "button-anchor",
    type: "button",
    group: "button",
    label: "Anchor Link",
    icon: "Jump",
    description: "Jump to another section on the page.",
    name: "",
    text: "",
    settings: { variant: "anchor", href: "", buttonColor: "transparent", buttonHoverColor: "transparent", textColor: "#214c71", textHoverColor: "#0f4f8f", borderColor: "transparent", paddingX: "16", paddingY: "8" }
  },
  {
    id: "contact-form-default",
    type: "contact-form",
    group: "contact-form",
    label: "Contact Form",
    icon: "CF",
    description: "Squeeze, standard, or custom contact capture.",
    name: "",
    text: "",
    settings: { formMode: "squeeze" }
  },
  {
    id: "player-portal-login",
    type: "player-portal",
    group: "player-portal",
    label: "Player Login",
    icon: "PP",
    description: "Login and register for the Player Portal on any public page.",
    name: "Player Login",
    text: "",
    settings: {
      redirectPath: "/portal/dashboard",
      defaultMode: "login",
      showRegister: "true",
      showForgotPassword: "true"
    }
  },
  {
    id: "poll-previous-results",
    type: "previous-results",
    group: "previous-results",
    label: "Previous Results",
    icon: "PR",
    description: "Only the live previous-poll results panel.",
    name: "Previous Results",
    text: "",
    settings: {}
  },
  {
    id: "poll-current",
    type: "current-poll",
    group: "current-poll",
    label: "Current Poll",
    icon: "CP",
    description: "The live current poll with answer choices.",
    name: "Current Poll",
    text: "",
    settings: {}
  },
  {
    id: "poll-social-share",
    type: "social-share",
    group: "social-share",
    label: "Social Share",
    icon: "↗",
    description: "Share buttons that generate post text from the current poll.",
    name: "",
    text: "",
    settings: {
      shareLabel: "Share this poll",
      shareTemplate: 'I just answered: "{pollQuestion}" What would you pick? {url}',
      shareHashtags: "Normie,WYR",
      shareVia: "Normie765714",
      shareLabelSize: "14",
      shareIconBackground: "#ffffff",
      shareIconSize: "36",
      shareGlyphSize: "20",
      shareIconGap: "12"
    }
  },
  {
    id: "social-icons-row",
    type: "social",
    group: "social",
    label: "Social Icons",
    icon: "@",
    description: "A ready-to-edit strip of social media icons with links.",
    name: "",
    text: "",
    settings: { variant: "icons-row" }
  },
  {
    id: "table-standard",
    type: "table",
    group: "table",
    label: "Data Table",
    icon: "⊞",
    description: "A configurable data table with headers.",
    name: "",
    text: "",
    settings: { variant: "standard" }
  },
  {
    id: "slider-standard",
    type: "slider",
    group: "slider",
    label: "Card Slider",
    icon: "⇆",
    description: "A horizontal scroller of cards that can hold linked visual highlights.",
    name: "",
    text: "",
    settings: { variant: "standard" }
  },
  {
    id: "special-effects-confetti",
    type: "confetti",
    group: "special-effects",
    label: "Confetti",
    icon: "🪄",
    description: "Canvas confetti burst with adjustable particle settings.",
    name: "Confetti",
    text: "",
    settings: {}
  }
];
