"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PollDeepDiveTriggerFields,
  PollPodAnswerButtonFields,
  PollPodContentFields,
  PollPodLayoutFields,
  patchPollPodConfig
} from "@/components/admin-poll-pod-editor";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media";
import {
  POLL_POD_LABELS,
  POLL_POD_TYPES,
  clonePollPodConfig,
  createDefaultPollPodConfig,
  createDefaultPollPods,
  type PollPodType,
  type PollPodsSnapshot
} from "@/lib/poll-pod-config";

type PollSettingsLoadResponse = {
  settings?: {
    pods: PollPodsSnapshot;
  };
  error?: string;
};

const POD_DESCRIPTIONS: Record<PollPodType, string> = {
  polls:
    "Live voting pod. Use a narrower content width and a right-aligned background image to leave room for artwork on the right.",
  previous_results: "Shows the last question and community results after someone votes.",
  initial_page:
    "Shown in the Previous Results slot before the first answer. This is the welcome / how-it-works state.",
  interstitial:
    "Reserved for promotions and special messages between polls. Wiring on the site comes later; configure the look now."
};

export function AdminPollSettingsForm() {
  const [pods, setPods] = useState<PollPodsSnapshot>(createDefaultPollPods());
  const [activePod, setActivePod] = useState<PollPodType>("polls");
  const [cloneSource, setCloneSource] = useState<PollPodType>("polls");
  const [galleryImagePath, setGalleryImagePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeConfig = pods[activePod];

  function updateActivePod(patch: Parameters<typeof patchPollPodConfig>[1]) {
    setPods((current) => ({
      ...current,
      [activePod]: patchPollPodConfig(current[activePod], patch)
    }));
  }

  // Only called from the mount effect; isLoading starts true and error
  // empty, so no synchronous setState is needed before the fetch.
  const loadSettings = useCallback(async () => {
    try {
      const payload = await readAdminJson<PollSettingsLoadResponse>(
        await fetch("/api/admin/polls/settings", { cache: "no-store" }),
        "Failed to load poll settings."
      );

      setPods(payload.settings?.pods ?? createDefaultPollPods());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load poll settings.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function openGallery() {
    const payload = await readAdminJson<{ media?: AdminMediaItem[] }>(
      await fetch("/api/admin/media", { cache: "no-store" }),
      "Failed to load media gallery."
    ).catch(() => null);

    if (!payload) {
      return;
    }

    const firstImage = (payload.media ?? []).find((item) => item.kind === "image");

    if (firstImage) {
      setGalleryImagePath(firstImage.path);
    }
  }

  async function saveSettings() {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await readAdminJson<{ error?: string }>(
        await fetch("/api/admin/polls/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pods })
        }),
        "Failed to save poll settings."
      );

      setMessage("Poll settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save poll settings.");
    } finally {
      setIsSaving(false);
    }
  }

  function applyClone(mode: "layout" | "all") {
    setPods((current) => clonePollPodConfig(current, cloneSource, activePod, mode));
    setMessage(
      mode === "layout"
        ? `Copied layout from ${POLL_POD_LABELS[cloneSource]} to ${POLL_POD_LABELS[activePod]}.`
        : `Copied settings from ${POLL_POD_LABELS[cloneSource]} to ${POLL_POD_LABELS[activePod]}.`
    );
  }

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Polls</div>
            <h2>Poll settings</h2>
            <p className="page-copy admin-copy">
              Configure layout and content for each poll pod type. Use copy controls to keep pods in
              sync when you want them to match.
            </p>
          </div>
          <div className="admin-actions">
            <button
              className="submit-button admin-blog-add-button"
              disabled={isSaving || isLoading}
              onClick={() => void saveSettings()}
              type="button"
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
        {message ? <div className="notice success admin-notice">{message}</div> : null}
        {error ? <div className="notice error admin-notice">{error}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-poll-pod-tabs" role="tablist" aria-label="Poll pod types">
          {POLL_POD_TYPES.map((podType) => (
            <button
              key={podType}
              className={podType === activePod ? "admin-poll-pod-tab is-active" : "admin-poll-pod-tab"}
              onClick={() => setActivePod(podType)}
              role="tab"
              type="button"
              aria-selected={podType === activePod}
            >
              {POLL_POD_LABELS[podType]}
            </button>
          ))}
        </div>

        <p className="page-copy admin-copy">{POD_DESCRIPTIONS[activePod]}</p>

        <div className="admin-poll-clone-bar">
          <label className="field admin-poll-clone-field">
            <span>Copy from</span>
            <select value={cloneSource} onChange={(event) => setCloneSource(event.target.value as PollPodType)}>
              {POLL_POD_TYPES.filter((podType) => podType !== activePod).map((podType) => (
                <option key={podType} value={podType}>
                  {POLL_POD_LABELS[podType]}
                </option>
              ))}
            </select>
          </label>
          <button className="secondary-button" onClick={() => applyClone("layout")} type="button">
            Copy layout &gt;&gt;
          </button>
          <button className="secondary-button" onClick={() => applyClone("all")} type="button">
            Copy all &gt;&gt;
          </button>
        </div>

        {isLoading ? (
          <p className="page-copy admin-copy">Loading settings...</p>
        ) : (
          <>
            <section className="admin-section admin-poll-pod-section">
              <h3 className="admin-section-heading">Layout</h3>
              <PollPodLayoutFields
                contentWidthHelp={
                  activePod === "polls"
                    ? "Pair with Pod background → Image and position Right for artwork on the right."
                    : "Applies to the main content block in this pod."
                }
                galleryImagePath={galleryImagePath}
                layout={activeConfig.layout}
                onChange={(patch) => updateActivePod({ layout: patch })}
                onGalleryImageConsumed={() => setGalleryImagePath(null)}
                onOpenGallery={() => void openGallery()}
              />
            </section>

            {activePod === "polls" && activeConfig.answerButtons ? (
              <section className="admin-section admin-poll-pod-section">
                <h3 className="admin-section-heading">Answer buttons</h3>
                <PollPodAnswerButtonFields
                  buttons={activeConfig.answerButtons}
                  onChange={(patch) => updateActivePod({ answerButtons: patch })}
                />
              </section>
            ) : null}

            {activePod === "previous_results" ? (
              <section className="admin-section admin-poll-pod-section">
                <h3 className="admin-section-heading">Deep Dive button</h3>
                <p className="page-copy admin-copy">
                  Styling for the Deep Dive control on the Previous Results pod (opens related content,
                  video, or blog).
                </p>
                <PollDeepDiveTriggerFields
                  trigger={
                    activeConfig.deepDiveTrigger ??
                    createDefaultPollPodConfig("previous_results").deepDiveTrigger!
                  }
                  onChange={(patch) => updateActivePod({ deepDiveTrigger: patch })}
                />
              </section>
            ) : null}

            {(activePod === "initial_page" || activePod === "interstitial") && activeConfig.content ? (
              <section className="admin-section admin-poll-pod-section">
                <h3 className="admin-section-heading">Content</h3>
                <PollPodContentFields
                  content={activeConfig.content}
                  galleryImagePath={galleryImagePath}
                  onChange={(patch) => updateActivePod({ content: patch })}
                  onGalleryImageConsumed={() => setGalleryImagePath(null)}
                  onOpenGallery={() => void openGallery()}
                  type={activePod}
                />
              </section>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}
