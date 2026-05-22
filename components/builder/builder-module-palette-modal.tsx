import type { ModulePaletteGroup, ModulePaletteItem } from "./builder-types";
import { modulePaletteGroups, modulePaletteItems } from "./builder-types";

type BuilderModulePaletteModalProps = {
  activeGroup: ModulePaletteGroup | null;
  onSelectGroup: (group: ModulePaletteGroup) => void;
  onSelectItem: (item: ModulePaletteItem) => void;
  onClose: () => void;
};

export function BuilderModulePaletteModal({
  activeGroup,
  onSelectGroup,
  onSelectItem,
  onClose
}: BuilderModulePaletteModalProps) {
  const activePaletteItems = activeGroup
    ? modulePaletteItems.filter((item) => item.group === activeGroup)
    : [];

  return (
    <div className="builder-gallery-overlay" onClick={onClose} role="presentation">
      <div
        className="builder-gallery-modal builder-module-palette-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Module library"
      >
        <div className="builder-gallery-header">
          <div>
            <div className="panel-label">Module Library</div>
            <h3>Add a module to this pod</h3>
            <p className="page-copy admin-copy">
              {activeGroup
                ? "Pick a module style below, or switch groups from the top row."
                : "Start by choosing a module group."}
            </p>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {activeGroup ? (
          <>
            <div className="builder-module-group-tabs">
              {modulePaletteGroups.map((group) => (
                <button
                  className={`builder-module-group-tab ${activeGroup === group.value ? "is-active" : ""}`}
                  key={group.value}
                  onClick={() => onSelectGroup(group.value)}
                  type="button"
                >
                  <span className="builder-module-group-icon">{group.icon}</span>
                  <span>{group.label}</span>
                </button>
              ))}
            </div>
            <div className="builder-module-item-grid">
              {activePaletteItems.map((item) => (
                <button
                  className="builder-module-item-card"
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  type="button"
                >
                  <span className="builder-module-item-icon">{item.icon}</span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="builder-module-group-grid">
            {modulePaletteGroups.map((group) => (
              <button
                className="builder-module-group-card"
                key={group.value}
                onClick={() => onSelectGroup(group.value)}
                type="button"
              >
                <span className="builder-module-group-card-icon">{group.icon}</span>
                <strong>{group.label}</strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
