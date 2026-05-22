import type { ReactNode } from "react";

type BuilderCellPanelHeaderProps = {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  panelName?: string;
  headingActions?: ReactNode;
};

export function BuilderCellPanelHeader({
  title,
  isCollapsed,
  onToggle,
  panelName,
  headingActions
}: BuilderCellPanelHeaderProps) {
  const label = panelName ?? title;

  const header = (
    <div aria-expanded={!isCollapsed} className="builder-cell-panel-header">
      <div className="builder-cell-panel-title">
        <button className="builder-cell-panel-title-label" onClick={onToggle} type="button">
          <strong>{title}</strong>
        </button>
      </div>
      <div className="builder-section-actions">
        <button
          aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
          className="builder-icon-button"
          onClick={onToggle}
          type="button"
        >
          {isCollapsed ? "▸" : "▾"}
        </button>
      </div>
    </div>
  );

  if (!headingActions) {
    return header;
  }

  return (
    <div className="builder-panel-toggle-row">
      {header}
      <span className="builder-panel-heading-actions">{headingActions}</span>
    </div>
  );
}
