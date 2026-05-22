import type { ReactNode } from "react";

type PlayerSettingRowProps = {
  label: string;
  children: ReactNode;
  hint?: string;
};

export function PlayerSettingRow({ label, children, hint }: PlayerSettingRowProps) {
  return (
    <div className="player-setting-row">
      <span className="player-setting-label">{label}</span>
      <div className="player-setting-value">
        {children}
        {hint ? <p className="player-setting-hint">{hint}</p> : null}
      </div>
    </div>
  );
}
