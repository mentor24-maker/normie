import Link from "next/link";
import type { CSSProperties } from "react";

export type BuilderMenuItem = {
  id: string;
  label: string;
  href: string;
};

export function getBuilderMenuStyle(settings: Record<string, string>): CSSProperties {
  const borderWidth = Number.parseInt(settings.menuBorderWidth ?? "1", 10);
  const borderRadius = Number.parseInt(settings.menuBorderRadius ?? "26", 10);

  return {
    "--menu-bg": settings.menuBackgroundColor || "rgba(255, 255, 255, 0.74)",
    "--menu-text": settings.menuTextColor || "#163a5e",
    "--menu-hover-bg": settings.menuHoverBackgroundColor || "rgba(23, 183, 238, 0.12)",
    "--menu-hover-text": settings.menuHoverTextColor || "#0a8fc4",
    "--menu-border": settings.menuBorderColor || "rgba(9, 16, 24, 0.08)",
    "--menu-item-radius": `${Math.max(Number.isFinite(borderRadius) ? borderRadius - 8 : 18, 0)}px`,
    background: settings.menuBackgroundColor || "rgba(255, 255, 255, 0.74)",
    border: `${Math.max(Number.isFinite(borderWidth) ? borderWidth : 1, 0)}px solid ${
      settings.menuBorderColor || "rgba(9, 16, 24, 0.08)"
    }`,
    borderRadius: `${Math.max(Number.isFinite(borderRadius) ? borderRadius : 26, 0)}px`
  } as CSSProperties;
}

export function BuilderMenu({
  items,
  settings
}: {
  items: BuilderMenuItem[];
  settings: Record<string, string>;
}) {
  return (
    <nav aria-label="Builder navigation" className="builder-menu" style={getBuilderMenuStyle(settings)}>
      {items.map((item) => (
        <Link className="builder-menu-link" href={item.href || "#"} key={item.id || `${item.label}-${item.href}`}>
          {item.label || "Menu Item"}
        </Link>
      ))}
    </nav>
  );
}
