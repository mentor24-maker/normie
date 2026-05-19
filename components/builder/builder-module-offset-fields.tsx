import { normalizeSignedOffsetValue } from "@/lib/builder-template";

type BuilderModuleOffsetFieldsProps = {
  horizontalOffset: string;
  verticalOffset: string;
  onHorizontalOffsetChange: (value: string) => void;
  onVerticalOffsetChange: (value: string) => void;
};

export function BuilderModuleOffsetFields({
  horizontalOffset,
  verticalOffset,
  onHorizontalOffsetChange,
  onVerticalOffsetChange
}: BuilderModuleOffsetFieldsProps) {
  return (
    <div className="builder-module-offset-grid">
      <label className="field">
        <span>Horizontal offset</span>
        <input
          type="number"
          min="-500"
          max="500"
          step="1"
          value={horizontalOffset}
          onChange={(event) => onHorizontalOffsetChange(normalizeSignedOffsetValue(event.target.value, "0"))}
        />
        <small>Positive moves right; negative moves left.</small>
      </label>
      <label className="field">
        <span>Vertical offset</span>
        <input
          type="number"
          min="-500"
          max="500"
          step="1"
          value={verticalOffset}
          onChange={(event) => onVerticalOffsetChange(normalizeSignedOffsetValue(event.target.value, "0"))}
        />
        <small>Positive moves up; negative moves down.</small>
      </label>
    </div>
  );
}
