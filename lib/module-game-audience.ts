export const MODULE_GAME_AUDIENCE_SETTING_KEY = "gameAudience";

export const MODULE_GAME_AUDIENCE_OPTIONS = [
  { value: "public", label: "Public Site" },
  { value: "portal", label: "Player Portal" },
  { value: "both", label: "Public and Portal" }
] as const;

export type ModuleGameAudience = (typeof MODULE_GAME_AUDIENCE_OPTIONS)[number]["value"];

export type ModuleGamePlayContext = "public" | "portal";

export function normalizeModuleGameAudience(value: string | undefined): ModuleGameAudience {
  const candidate = String(value ?? "").trim();

  if (MODULE_GAME_AUDIENCE_OPTIONS.some((option) => option.value === candidate)) {
    return candidate as ModuleGameAudience;
  }

  return "both";
}

export function getModuleGameAudience(settings: Record<string, string>): ModuleGameAudience {
  return normalizeModuleGameAudience(settings[MODULE_GAME_AUDIENCE_SETTING_KEY]);
}

export function moduleFiresForGameContext(
  settings: Record<string, string>,
  context: ModuleGamePlayContext
): boolean {
  const audience = getModuleGameAudience(settings);

  if (audience === "both") {
    return true;
  }

  return audience === context;
}
