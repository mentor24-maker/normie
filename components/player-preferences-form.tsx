"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { PlayerSettingRow } from "@/components/player-setting-row";
import { POLL_CATEGORY_SEEDS } from "@/lib/poll-categories";
import type { PlayerPreferencesDetails } from "@/lib/player-preferences-details";

type PlayerPreferencesFormProps = {
  initialPreferences: PlayerPreferencesDetails;
};

export function PlayerPreferencesForm({ initialPreferences }: PlayerPreferencesFormProps) {
  const router = useRouter();
  const [preferredPollCategories, setPreferredPollCategories] = useState(
    initialPreferences.preferredPollCategories
  );
  const [defaultPlayPollCategory, setDefaultPlayPollCategory] = useState(
    initialPreferences.defaultPlayPollCategory
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(() => POLL_CATEGORY_SEEDS.map((category) => category.name), []);

  const defaultCategoryOptions = useMemo(() => {
    if (preferredPollCategories.length === 0) {
      return categoryOptions;
    }

    return preferredPollCategories;
  }, [categoryOptions, preferredPollCategories]);

  function toggleCategory(categoryName: string) {
    setPreferredPollCategories((current) => {
      if (current.includes(categoryName)) {
        const next = current.filter((name) => name !== categoryName);

        if (defaultPlayPollCategory && !next.includes(defaultPlayPollCategory)) {
          setDefaultPlayPollCategory("");
        }

        return next;
      }

      return [...current, categoryName];
    });
  }

  function selectAllCategories() {
    setPreferredPollCategories([...categoryOptions]);
  }

  function clearCategories() {
    setPreferredPollCategories([]);
    setDefaultPlayPollCategory("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/player/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          preferredPollCategories,
          defaultPlayPollCategory
        })
      });
      const data = (await response.json()) as {
        error?: string;
        data?: PlayerPreferencesDetails;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Preferences could not be saved.");
      }

      if (data.data) {
        setPreferredPollCategories(data.data.preferredPollCategories);
        setDefaultPlayPollCategory(data.data.defaultPlayPollCategory);
      }

      setNotice("Preferences saved.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Preferences could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="player-preferences-form" onSubmit={handleSubmit}>
      <section className="panel player-panel player-preferences-section" aria-labelledby="player-preferences-polls-heading">
        <div className="panel-label">Poll Experience</div>
        <h2 id="player-preferences-polls-heading">Categories You Want to See</h2>
        <p className="panel-copy">
          Choose which poll categories appear when you play. Leave all unchecked to see every published
          category. Profile and privacy settings stay on your{" "}
          <Link href="/portal/profile">Profile</Link> page.
        </p>

        <div className="player-preferences-category-toolbar">
          <button className="secondary-button" onClick={selectAllCategories} type="button">
            Select All
          </button>
          <button className="secondary-button" onClick={clearCategories} type="button">
            Clear All
          </button>
        </div>

        <div className="player-preferences-category-grid" role="group" aria-label="Preferred poll categories">
          {POLL_CATEGORY_SEEDS.map((category) => {
            const isChecked = preferredPollCategories.includes(category.name);

            return (
              <label className="player-preferences-category-option" key={category.slug}>
                <input
                  checked={isChecked}
                  onChange={() => toggleCategory(category.name)}
                  type="checkbox"
                />
                <span>{category.name}</span>
              </label>
            );
          })}
        </div>

        <div className="player-profile-fields player-preferences-fields">
          <PlayerSettingRow
            hint={
              preferredPollCategories.length === 0
                ? "Applies across all categories until you narrow the list above."
                : "Must be one of your selected categories."
            }
            label="Default Category"
          >
            <select
              className="player-form-control"
              onChange={(event) => setDefaultPlayPollCategory(event.target.value)}
              value={defaultPlayPollCategory}
            >
              <option value="">First Available</option>
              {defaultCategoryOptions.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>
          </PlayerSettingRow>
        </div>
      </section>

      <section className="panel player-panel player-preferences-section" aria-labelledby="player-preferences-future-heading">
        <div className="panel-label">Coming Soon</div>
        <h2 id="player-preferences-future-heading">More Controls on the Way</h2>
        <p className="panel-copy">
          We plan to add email digests for new polls in your categories, notification timing, and
          leaderboard visibility options. Tell us what you want next.
        </p>
      </section>

      <div className="player-profile-actions">
        <button className="submit-button player-profile-save-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving Preferences..." : "Save Preferences"}
        </button>
        {notice ? <div className="notice success player-inline-notice">{notice}</div> : null}
        {error ? <div className="notice error player-inline-notice">{error}</div> : null}
      </div>
    </form>
  );
}
