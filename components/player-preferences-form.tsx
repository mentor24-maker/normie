"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { PlayerSettingRow } from "@/components/player-setting-row";
import { dispatchPlayerPreferencesUpdated } from "@/lib/player-preferences-events";
import { usePollCategoryCatalog } from "@/lib/use-poll-category-catalog";
import type { PlayerPreferencesDetails } from "@/lib/player-preferences-details";

type PlayerPreferencesFormProps = {
  initialPreferences: PlayerPreferencesDetails;
};

export function PlayerPreferencesForm({ initialPreferences }: PlayerPreferencesFormProps) {
  const router = useRouter();
  const { catalog: pollCategoryCatalog } = usePollCategoryCatalog();
  const [preferredPollCategories, setPreferredPollCategories] = useState(
    initialPreferences.preferredPollCategories
  );
  const [defaultPlayPollCategory, setDefaultPlayPollCategory] = useState(
    initialPreferences.defaultPlayPollCategory
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const categoryOptions = useMemo(
    () => pollCategoryCatalog.map((category) => ({ slug: category.slug, name: category.name })),
    [pollCategoryCatalog]
  );

  const defaultCategoryOptions = useMemo(() => {
    if (preferredPollCategories.length === 0) {
      return categoryOptions;
    }

    return categoryOptions.filter((category) => preferredPollCategories.includes(category.slug));
  }, [categoryOptions, preferredPollCategories]);

  function toggleCategory(categorySlug: string) {
    setPreferredPollCategories((current) => {
      if (current.includes(categorySlug)) {
        const next = current.filter((slug) => slug !== categorySlug);

        if (defaultPlayPollCategory && !next.includes(defaultPlayPollCategory)) {
          setDefaultPlayPollCategory("");
        }

        return next;
      }

      return [...current, categorySlug];
    });
  }

  function selectAllCategories() {
    setPreferredPollCategories(categoryOptions.map((category) => category.slug));
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
        preferences?: PlayerPreferencesDetails;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Preferences could not be saved.");
      }

      if (data.preferences) {
        setPreferredPollCategories(data.preferences.preferredPollCategories);
        setDefaultPlayPollCategory(data.preferences.defaultPlayPollCategory);
      }

      dispatchPlayerPreferencesUpdated();
      setNotice("Preferences saved.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Preferences could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="player-preferences-form" onSubmit={(event) => void handleSubmit(event)}>
      {error ? <div className="notice error admin-notice">{error}</div> : null}
      {notice ? <div className="notice success admin-notice">{notice}</div> : null}

      <PlayerSettingRow label="Preferred Poll Categories">
        <div className="player-preferences-category-toolbar">
          <button className="secondary-button" onClick={selectAllCategories} type="button">
            Select All
          </button>
          <button className="secondary-button" onClick={clearCategories} type="button">
            Clear
          </button>
        </div>
        <div className="player-preferences-category-grid">
          {categoryOptions.map((category) => {
            const checked = preferredPollCategories.includes(category.slug);

            return (
              <label className="player-preferences-category-option" key={category.slug}>
                <input
                  checked={checked}
                  onChange={() => toggleCategory(category.slug)}
                  type="checkbox"
                />
                <span>{category.name}</span>
              </label>
            );
          })}
        </div>
      </PlayerSettingRow>

      <PlayerSettingRow label="Default Play Poll Category">
        <select
          onChange={(event) => setDefaultPlayPollCategory(event.target.value)}
          value={defaultPlayPollCategory}
        >
          <option value="">Any Preferred Category</option>
          {defaultCategoryOptions.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </PlayerSettingRow>

      <div className="player-preferences-actions">
        <button className="submit-button admin-blog-add-button" disabled={isSaving} type="submit">
          Save Preferences
        </button>
        <Link className="secondary-button" href="/portal/dashboard">
          Back to Dashboard
        </Link>
      </div>
    </form>
  );
}
