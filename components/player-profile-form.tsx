"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { PlayerSettingRow } from "@/components/player-setting-row";
import {
  EMPTY_PLAYER_SOCIAL_LINKS,
  type PlayerProfileDetails,
  type PlayerSocialLinks
} from "@/lib/player-profile";

type PlayerProfileFormProps = {
  initialProfile: PlayerProfileDetails;
};

const socialFields: { key: keyof PlayerSocialLinks; label: string; placeholder: string }[] = [
  { key: "website", label: "Website", placeholder: "https://yoursite.com" },
  { key: "x", label: "X", placeholder: "https://x.com/you" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/you" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@you" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@you" },
  { key: "discord", label: "Discord", placeholder: "yourname or invite link" }
];

export function PlayerProfileForm({ initialProfile }: PlayerProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [handle, setHandle] = useState(initialProfile.handle);
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [bio, setBio] = useState(initialProfile.bio);
  const [socialLinks, setSocialLinks] = useState<PlayerSocialLinks>(initialProfile.socialLinks);
  const [shareProfile, setShareProfile] = useState(initialProfile.shareProfile);
  const [sharePollResponses, setSharePollResponses] = useState(initialProfile.sharePollResponses);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  function updateSocialLink(key: keyof PlayerSocialLinks, value: string) {
    setSocialLinks((current) => ({ ...current, [key]: value }));
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/player/avatar", {
        method: "POST",
        credentials: "same-origin",
        body: formData
      });
      const data = (await response.json()) as { error?: string; data?: { url?: string } };

      if (!response.ok) {
        throw new Error(data.error ?? "Avatar upload failed.");
      }

      const url = data.data?.url?.trim();

      if (!url) {
        throw new Error("Avatar upload did not return a URL.");
      }

      setAvatarUrl(url);
      setNotice("Avatar uploaded. Save Profile to keep it on your account.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Avatar upload failed.");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/player/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          fullName,
          handle,
          avatarUrl,
          bio,
          socialLinks,
          shareProfile,
          sharePollResponses
        })
      });
      const data = (await response.json()) as { error?: string; data?: PlayerProfileDetails };

      if (!response.ok) {
        throw new Error(data.error ?? "Profile could not be saved.");
      }

      if (data.data) {
        setFullName(data.data.fullName);
        setHandle(data.data.handle);
        setAvatarUrl(data.data.avatarUrl);
        setBio(data.data.bio);
        setSocialLinks(data.data.socialLinks);
        setShareProfile(data.data.shareProfile);
        setSharePollResponses(data.data.sharePollResponses);
      }

      setNotice("Profile saved.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  const avatarPreview = avatarUrl.trim();

  return (
    <form className="player-profile-form" onSubmit={handleSubmit}>
      <section className="panel player-panel player-profile-section" aria-labelledby="player-profile-public-heading">
        <div className="panel-label">Public Profile</div>
        <h2 id="player-profile-public-heading">How other Normies see you</h2>
        <p className="panel-copy">
          Set your display name, username, avatar, and short bio. Privacy toggles below control what gets shared.
        </p>

        <div className="player-profile-fields">
          <PlayerSettingRow label="Display Name">
            <input
              autoComplete="name"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Your name"
              type="text"
              value={fullName}
            />
          </PlayerSettingRow>

          <PlayerSettingRow label="Username" hint="Letters, numbers, and underscores only.">
            <div className="player-profile-handle-field">
              <span className="player-profile-handle-prefix">@</span>
              <input
                autoComplete="nickname"
                onChange={(event) => setHandle(event.target.value)}
                placeholder="normie_player"
                type="text"
                value={handle}
              />
            </div>
          </PlayerSettingRow>

          <PlayerSettingRow label="Avatar">
            <div className="player-profile-avatar-controls">
              <div className="player-profile-avatar-preview" aria-hidden={!avatarPreview}>
                {avatarPreview ? (
                  <img alt="" className="player-profile-avatar-image" src={avatarPreview} />
                ) : (
                  <span className="player-profile-avatar-placeholder">
                    {(fullName || handle || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="player-profile-avatar-actions">
                <input
                  onChange={(event) => void handleAvatarUpload(event)}
                  accept="image/*"
                  className="player-profile-avatar-input"
                  disabled={isUploadingAvatar}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="secondary-button"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {isUploadingAvatar ? "Uploading..." : "Upload Image"}
                </button>
                <input
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={avatarUrl}
                />
              </div>
            </div>
          </PlayerSettingRow>

          <PlayerSettingRow label="Bio">
            <textarea
              maxLength={500}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Tell other Normies a little about yourself."
              rows={4}
              value={bio}
            />
          </PlayerSettingRow>
        </div>
      </section>

      <section className="panel player-panel player-profile-section" aria-labelledby="player-profile-social-heading">
        <div className="panel-label">Social Profiles</div>
        <h2 id="player-profile-social-heading">Links and handles</h2>
        <p className="panel-copy">Add the profiles you want on your public Normie card.</p>

        <div className="player-profile-fields">
          {socialFields.map((field) => (
            <PlayerSettingRow key={field.key} label={field.label}>
              <input
                onChange={(event) => updateSocialLink(field.key, event.target.value)}
                placeholder={field.placeholder}
                type={field.key === "discord" ? "text" : "url"}
                value={socialLinks[field.key] ?? EMPTY_PLAYER_SOCIAL_LINKS[field.key]}
              />
            </PlayerSettingRow>
          ))}
        </div>
      </section>

      <section className="panel player-panel player-profile-section" aria-labelledby="player-profile-privacy-heading">
        <div className="panel-label">Privacy</div>
        <h2 id="player-profile-privacy-heading">Sharing preferences</h2>
        <p className="panel-copy">
          More granular privacy controls are coming soon. For now, choose whether Normie can share your profile and poll
          responses.
        </p>

        <div className="player-profile-fields">
          <PlayerSettingRow label="Share Profile Info">
            <label className="player-profile-toggle">
              <input
                checked={shareProfile}
                onChange={(event) => setShareProfile(event.target.checked)}
                type="checkbox"
              />
              <span>{shareProfile ? "On" : "Off"}</span>
            </label>
          </PlayerSettingRow>

          <PlayerSettingRow label="Share Poll Responses">
            <label className="player-profile-toggle">
              <input
                checked={sharePollResponses}
                onChange={(event) => setSharePollResponses(event.target.checked)}
                type="checkbox"
              />
              <span>{sharePollResponses ? "On" : "Off"}</span>
            </label>
          </PlayerSettingRow>
        </div>
      </section>

      <div className="player-profile-actions">
        <button className="submit-button player-profile-save-button" disabled={isSaving} type="submit">
          {isSaving ? "Saving Profile..." : "Save Profile"}
        </button>
        {notice ? <div className="notice success player-inline-notice">{notice}</div> : null}
        {error ? <div className="notice error player-inline-notice">{error}</div> : null}
      </div>
    </form>
  );
}
