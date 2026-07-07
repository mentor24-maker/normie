"use client";

import { GAME_SECTION_TILES, GameSection, GameSnapshot, readAdminJson } from "@/components/admin-game/helpers";

import { InterstitialsSection } from "@/components/admin-game/interstitials-section";
import { ScoringSection } from "@/components/admin-game/scoring-section";
import { LevelsSection } from "@/components/admin-game/levels-section";
import { RedemptionsSection } from "@/components/admin-game/redemptions-section";
import { LevelUpSection } from "@/components/admin-game/level-up-section";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";

import type { GameLevel, GameLevelUpRule, GameLevelEvent, GameEventModule, GameInterstitial, GameProgressiveFeature, GameReward, GameScoringRule } from "@/lib/game-admin";

export function AdminGameWorkspace() {
  const [gameLevels, setGameLevels] = useState<GameLevel[]>([]);
  const [eventModules, setEventModules] = useState<GameEventModule[]>([]);
  const [levelUpRules, setLevelUpRules] = useState<GameLevelUpRule[]>([]);
  const [levelEvents, setLevelEvents] = useState<GameLevelEvent[]>([]);
  const [progressiveFeatures, setProgressiveFeatures] = useState<GameProgressiveFeature[]>([]);
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [scoringRules, setScoringRules] = useState<GameScoringRule[]>([]);
  const [interstitials, setInterstitials] = useState<GameInterstitial[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [activeSection, setActiveSection] = useState<GameSection>("levels");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadGalleryMedia() {
    try {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const data = await readAdminJson<{ media?: AdminMediaItem[]; error?: string }>(
        response,
        "Failed to load media gallery."
      );
      setGalleryMedia((data.media ?? []).filter((item) => item.kind === "image"));
    } catch {
      setGalleryMedia([]);
    }
  }

  async function loadGame() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/game", { cache: "no-store" });
      const data = await readAdminJson<GameSnapshot & { error?: string }>(response, "Failed to load game settings.");
      setGameLevels(data.gameLevels ?? []);
      setEventModules(data.eventModules ?? []);
      setLevelUpRules(data.levelUpRules ?? []);
      setLevelEvents(data.levelEvents ?? []);
      setProgressiveFeatures(data.progressiveFeatures ?? []);
      setRewards(data.rewards ?? []);
      setScoringRules(data.scoringRules ?? []);
      setInterstitials(data.interstitials ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load game settings.");
      setGameLevels([]);
      setEventModules([]);
      setLevelUpRules([]);
      setLevelEvents([]);
      setProgressiveFeatures([]);
      setRewards([]);
      setScoringRules([]);
      setInterstitials([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadGame();
    void loadGalleryMedia();
  }, []);

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Game</div>
            <h2>Engagement Engine</h2>
            <p className="page-copy admin-copy">
              Manage progression tiers and point rewards for the Normie player layer.
            </p>
          </div>
          <div className="admin-actions">
            <Link className="secondary-button" href="/portal/leaderboard">
              Leaderboard
            </Link>
          </div>
        </div>
        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}
        <div className="admin-game-tile-grid">
          {GAME_SECTION_TILES.map((tile) => (
            <button
              className={`admin-game-tile${activeSection === tile.key ? " is-active" : ""}`}
              key={tile.key}
              onClick={() => setActiveSection(tile.key)}
              type="button"
            >
              <strong>{tile.label}</strong>
              <span>{tile.description}</span>
            </button>
          ))}
        </div>
      </section>

      {activeSection === "levels" ? (
        <LevelsSection
          gameLevels={gameLevels}
          setGameLevels={setGameLevels}
          isLoading={isLoading}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {activeSection === "level-up" ? (
        <LevelUpSection
          levelUpRules={levelUpRules}
          setLevelUpRules={setLevelUpRules}
          levelEvents={levelEvents}
          setLevelEvents={setLevelEvents}
          progressiveFeatures={progressiveFeatures}
          setProgressiveFeatures={setProgressiveFeatures}
          gameLevels={gameLevels}
          scoringRules={scoringRules}
          eventModules={eventModules}
          isLoading={isLoading}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {activeSection === "redemptions" ? (
        <RedemptionsSection
          rewards={rewards}
          setRewards={setRewards}
          gameLevels={gameLevels}
          progressiveFeatures={progressiveFeatures}
          galleryMedia={galleryMedia}
          loadGalleryMedia={loadGalleryMedia}
          isLoading={isLoading}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {activeSection === "scoring" ? (
        <ScoringSection
          scoringRules={scoringRules}
          setScoringRules={setScoringRules}
          isLoading={isLoading}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}

      {activeSection === "interstitials" ? (
        <InterstitialsSection
          interstitials={interstitials}
          setInterstitials={setInterstitials}
          isLoading={isLoading}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          setError={setError}
          setMessage={setMessage}
        />
      ) : null}
    </section>
  );
}
