"use client";

import { type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminMediaItem } from "@/lib/admin-media";
import { appendRichTextImageToHtml } from "@/lib/rich-text-image";
import { normalizeBuilderAssetUrl } from "@/lib/builder-template";
import type { BuilderTemplateModule, BuilderTemplateSection } from "@/lib/builder-template";
import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";
import type { ModulePaletteAnchor } from "./builder-module-palette-modal";
import type { GalleryTarget, ModulePaletteGroup } from "./builder-types";

type UseBuilderMediaModalsParams = {
  galleryTarget: GalleryTarget | null;
  setGalleryTarget: Dispatch<SetStateAction<GalleryTarget | null>>;
  setGalleryAnchor: Dispatch<SetStateAction<BuilderModalAnchor | null>>;
  setIsGalleryOpen: Dispatch<SetStateAction<boolean>>;
  setIsModulePaletteOpen: Dispatch<SetStateAction<boolean>>;
  setModulePaletteTarget: Dispatch<SetStateAction<{ sectionId: string; column: string } | null>>;
  setModulePaletteAnchor: Dispatch<SetStateAction<ModulePaletteAnchor | null>>;
  setActiveModuleGroup: Dispatch<SetStateAction<ModulePaletteGroup | null>>;
  setGalleryMedia: Dispatch<SetStateAction<AdminMediaItem[]>>;
  setIsUploadingMedia: Dispatch<SetStateAction<boolean>>;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
  updateModule: (sectionId: string, moduleId: string, updater: (m: BuilderTemplateModule) => BuilderTemplateModule) => void;
  updateSection: (sectionId: string, updater: (s: BuilderTemplateSection) => BuilderTemplateSection) => void;
};

/**
 * Gallery/module-palette modal state management and media upload plumbing
 * for the builder editor. Extracted verbatim from admin-builder-editor.tsx;
 * image application goes through the draft-ops updaters passed in.
 */
export function useBuilderMediaModals({
  galleryTarget,
  setGalleryTarget,
  setGalleryAnchor,
  setIsGalleryOpen,
  setIsModulePaletteOpen,
  setModulePaletteTarget,
  setModulePaletteAnchor,
  setActiveModuleGroup,
  setGalleryMedia,
  setIsUploadingMedia,
  setError,
  setMessage,
  updateModule,
  updateSection
}: UseBuilderMediaModalsParams) {
  function openGallery(sectionId: string, moduleId: string) {
    setGalleryTarget({ kind: "module", sectionId, moduleId });
    setIsGalleryOpen(true);
  }

  function openRichTextGallery(sectionId: string, moduleId: string, anchor?: BuilderModalAnchor) {
    setGalleryAnchor(anchor ?? null);
    setGalleryTarget({ kind: "rich-text", sectionId, moduleId });
    setIsGalleryOpen(true);
  }

  function openButtonBackgroundGallery(sectionId: string, moduleId: string) {
    setGalleryTarget({ kind: "button-background", sectionId, moduleId });
    setIsGalleryOpen(true);
  }

  function openSocialIconGallery(sectionId: string, moduleId: string, itemId: string) {
    setGalleryTarget({ kind: "social-icon", sectionId, moduleId, itemId });
    setIsGalleryOpen(true);
  }

  function openSectionBackgroundGallery(sectionId: string) {
    setGalleryTarget({ kind: "section-background", sectionId });
    setIsGalleryOpen(true);
  }

  function openModulePalette(sectionId: string, column: string, anchor?: ModulePaletteAnchor) {
    setModulePaletteTarget({ sectionId, column });
    setModulePaletteAnchor(anchor ?? null);
    setActiveModuleGroup(null);
    setIsModulePaletteOpen(true);
  }

  function closeGallery() {
    setIsGalleryOpen(false);
    setGalleryTarget(null);
    setGalleryAnchor(null);
  }

  function closeModulePalette() {
    setIsModulePaletteOpen(false);
    setModulePaletteTarget(null);
    setModulePaletteAnchor(null);
    setActiveModuleGroup(null);
  }

  function selectGalleryImage(imagePath: string) {
    if (!galleryTarget) return;
    if (galleryTarget.kind === "rich-text") {
      updateModule(galleryTarget.sectionId, galleryTarget.moduleId, (module) => ({
        ...module,
        text: appendRichTextImageToHtml(module.text, normalizeBuilderAssetUrl(imagePath))
      }));
      closeGallery();
      return;
    }
    if (galleryTarget.kind === "module") {
      updateModule(galleryTarget.sectionId, galleryTarget.moduleId, (c) => ({
        ...c, settings: { ...c.settings, url: normalizeBuilderAssetUrl(imagePath) }
      }));
    } else if (galleryTarget.kind === "button-background") {
      updateModule(galleryTarget.sectionId, galleryTarget.moduleId, (c) => ({
        ...c,
        settings: {
          ...c.settings,
          buttonBackgroundMode: "image",
          buttonBackgroundImageUrl: normalizeBuilderAssetUrl(imagePath)
        }
      }));
    } else if (galleryTarget.kind === "social-icon") {
      updateModule(galleryTarget.sectionId, galleryTarget.moduleId, (current) => {
        let items: Array<Record<string, unknown>> = [];

        try {
          const parsed = JSON.parse(current.settings.socialItems || "[]");
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          items = [];
        }

        return {
          ...current,
          settings: {
            ...current.settings,
            socialItems: JSON.stringify(
              items.map((item, index) => {
                const id = String(item.id || `social-${index + 1}`);
                return id === galleryTarget.itemId
                  ? { ...item, id, iconUrl: normalizeBuilderAssetUrl(imagePath) }
                  : { ...item, id };
              })
            )
          }
        };
      });
    } else {
      updateSection(galleryTarget.sectionId, (c) => ({
        ...c, background: { ...c.background, mode: "image", imageUrl: normalizeBuilderAssetUrl(imagePath) }
      }));
    }
    closeGallery();
  }

  async function uploadMedia(onSuccess: (media: AdminMediaItem) => void, file: File | null) {
    if (!file) return;
    setIsUploadingMedia(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: AdminMediaItem; error?: string }>(response, "Failed to upload media.");
      if (!data.media) throw new Error(data.error ?? "Failed to upload media.");
      const uploaded = data.media;
      setGalleryMedia((c) => [...c.filter((i) => i.path !== uploaded.path), uploaded].sort((a, b) => a.name.localeCompare(b.name)));
      onSuccess(uploaded);
      setMessage(`Uploaded ${uploaded.name} to gallery.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload media.");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  async function uploadRichTextGalleryImage(file: File): Promise<string | null> {
    if (!file) {
      return null;
    }

    setIsUploadingMedia(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = await readAdminJson<{ media?: AdminMediaItem; error?: string }>(response, "Failed to upload media.");
      if (!data.media) {
        throw new Error(data.error ?? "Failed to upload media.");
      }

      const uploaded = data.media;
      setGalleryMedia((current) =>
        [...current.filter((item) => item.path !== uploaded.path), uploaded].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setMessage(`Uploaded ${uploaded.name} to gallery.`);
      return normalizeBuilderAssetUrl(uploaded.path);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload media.");
      return null;
    } finally {
      setIsUploadingMedia(false);
    }
  }

  function uploadMediaForModule(sectionId: string, moduleId: string, file: File | null) {
    void uploadMedia((m) => {
      updateModule(sectionId, moduleId, (c) => ({ ...c, settings: { ...c.settings, url: normalizeBuilderAssetUrl(m.path) } }));
    }, file);
  }

  function uploadButtonBackgroundMedia(sectionId: string, moduleId: string, file: File | null) {
    void uploadMedia((m) => {
      updateModule(sectionId, moduleId, (c) => ({
        ...c,
        settings: {
          ...c.settings,
          buttonBackgroundMode: "image",
          buttonBackgroundImageUrl: normalizeBuilderAssetUrl(m.path)
        }
      }));
    }, file);
  }

  function uploadMediaForSectionBackground(sectionId: string, file: File | null) {
    void uploadMedia((m) => {
      updateSection(sectionId, (c) => ({ ...c, background: { ...c.background, mode: "image", imageUrl: normalizeBuilderAssetUrl(m.path) } }));
    }, file);
  }

  return {
    openGallery,
    openRichTextGallery,
    openButtonBackgroundGallery,
    openSocialIconGallery,
    openSectionBackgroundGallery,
    openModulePalette,
    closeGallery,
    closeModulePalette,
    selectGalleryImage,
    uploadMedia,
    uploadRichTextGalleryImage,
    uploadMediaForModule,
    uploadButtonBackgroundMedia,
    uploadMediaForSectionBackground
  };
}
