"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import { BuilderTemplatePreview } from "@/components/builder-template-preview";
import {
  BUILDER_PREVIEW_STORAGE_KEY,
  createDefaultBackgroundSettings,
  createEmptyModule,
  createEmptySection,
  getBuilderBackgroundStyle,
  getLayoutColumns,
  getLayoutGridTemplate,
  normalizeBuilderAssetUrl,
  type BackgroundSettings,
  type BuilderPageRecord,
  type BuilderTemplateLayout,
  type BuilderTemplateModule,
  type BuilderTemplateRecord,
  type BuilderTemplateSection
} from "@/lib/builder-template";

import type { GalleryTarget, ModulePaletteGroup, ModulePaletteItem } from "./builder/builder-types";
import { layoutOptions } from "./builder/builder-types";
import { createDraftFromTemplate, createDraftFromPage, getModuleBackgroundSettings } from "./builder/builder-utils";
import { BuilderBackgroundControls } from "./builder/builder-background-controls";
import { BuilderTemplateList } from "./builder/builder-template-list";
import { BuilderPageList } from "./builder/builder-page-list";
import { BuilderSectionCard } from "./builder/builder-section-card";
import { BuilderGalleryModal } from "./builder/builder-gallery-modal";
import { BuilderModulePaletteModal } from "./builder/builder-module-palette-modal";

export function AdminBuilderEditor() {
  const [builderMode, setBuilderMode] = useState<"templates" | "pages">("templates");
  const [pageTemplates, setPageTemplates] = useState<BuilderTemplateRecord[]>([]);
  const [pages, setPages] = useState<BuilderPageRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageTemplateId, setPageTemplateId] = useState("");
  const [isPublishedPage, setIsPublishedPage] = useState(true);
  const [draft, setDraft] = useState(createDraftFromTemplate(null));
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOverWorkspace, setDragOverWorkspace] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isModulePaletteOpen, setIsModulePaletteOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<GalleryTarget | null>(null);
  const [modulePaletteTarget, setModulePaletteTarget] = useState<{ sectionId: string; column: string } | null>(null);
  const [activeModuleGroup, setActiveModuleGroup] = useState<ModulePaletteGroup | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // --- Derived values ---

  const selectedTemplate = useMemo(
    () => pageTemplates.find((t) => t.id === selectedTemplateId) ?? null,
    [pageTemplates, selectedTemplateId]
  );
  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId]
  );

  // --- Data loading ---

  async function loadPageTemplates() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/page-templates", { cache: "no-store" });
      const data = (await response.json()) as { pageTemplates?: BuilderTemplateRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load page templates.");
      const templates = data.pageTemplates ?? [];
      setPageTemplates(templates);
      if (!templates.some((t) => t.id === selectedTemplateId)) {
        setSelectedTemplateId(templates[0]?.id ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load page templates.");
      setPageTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadPages() {
    try {
      const response = await fetch("/api/admin/pages", { cache: "no-store" });
      const data = (await response.json()) as { pages?: BuilderPageRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load pages.");
      const nextPages = data.pages ?? [];
      setPages(nextPages);
      if (!nextPages.some((p) => p.id === selectedPageId)) setSelectedPageId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pages.");
      setPages([]);
    }
  }

  useEffect(() => { void loadPageTemplates(); void loadPages(); }, []);

  useEffect(() => {
    async function loadMediaLibrary() {
      try {
        const response = await fetch("/api/admin/media", { cache: "no-store" });
        const data = (await response.json()) as { media?: AdminMediaItem[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to load media gallery.");
        setGalleryMedia(data.media ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load media gallery.");
      }
    }
    void loadMediaLibrary();
  }, []);

  useEffect(() => {
    if (builderMode === "templates") setDraft(createDraftFromTemplate(selectedTemplate));
  }, [builderMode, selectedTemplate]);

  useEffect(() => {
    if (builderMode === "pages") {
      setDraft(createDraftFromPage(selectedPage));
      setPageSlug(selectedPage?.slug ?? "");
      setPageTemplateId(selectedPage?.templateId ?? "");
      setIsPublishedPage(selectedPage?.isPublished ?? true);
    }
  }, [builderMode, selectedPage]);

  useEffect(() => {
    setCollapsedSectionIds((c) => c.filter((id) => draft.layoutSections.some((s) => s.id === id)));
  }, [draft.layoutSections]);

  useEffect(() => {
    setExpandedModuleIds((c) =>
      c.filter((id) => draft.layoutSections.some((s) => s.modules.some((m) => m.id === id)))
    );
  }, [draft.layoutSections]);

  // --- Draft mutations ---

  function setDraftName(name: string) {
    setDraft((c) => ({ ...c, name }));
  }

  function updatePageBackground(updater: (bg: BackgroundSettings) => BackgroundSettings) {
    setDraft((c) => ({ ...c, pageBackground: updater(c.pageBackground) }));
  }

  function updateSection(sectionId: string, updater: (s: BuilderTemplateSection) => BuilderTemplateSection) {
    setDraft((c) => ({
      ...c,
      layoutSections: c.layoutSections.map((s) => (s.id === sectionId ? updater(s) : s))
    }));
  }

  function updateCellBackground(sectionId: string, column: string, updater: (bg: BackgroundSettings) => BackgroundSettings) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBackgrounds: { ...s.cellBackgrounds, [column]: updater(s.cellBackgrounds[column] ?? createDefaultBackgroundSettings()) }
    }));
  }

  function updateCellPadding(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellPadding: {
        ...s.cellPadding,
        [column]: value
      }
    }));
  }

  function updateCellBorderWidth(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderWidth: {
        ...s.cellBorderWidth,
        [column]: value
      }
    }));
  }

  function updateCellBorderColor(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderColor: {
        ...s.cellBorderColor,
        [column]: value
      }
    }));
  }

  function updateCellBorderRadius(sectionId: string, column: string, value: string) {
    updateSection(sectionId, (s) => ({
      ...s,
      cellBorderRadius: {
        ...s.cellBorderRadius,
        [column]: value
      }
    }));
  }

  function updateModule(sectionId: string, moduleId: string, updater: (m: BuilderTemplateModule) => BuilderTemplateModule) {
    updateSection(sectionId, (s) => ({
      ...s,
      modules: s.modules.map((m) => (m.id === moduleId ? updater(m) : m))
    }));
  }

  function updateModuleBackground(sectionId: string, moduleId: string, updater: (bg: BackgroundSettings) => BackgroundSettings) {
    updateModule(sectionId, moduleId, (current) => {
      const next = updater(getModuleBackgroundSettings(current.settings));
      return {
        ...current,
        settings: {
          ...current.settings,
          backgroundMode: next.mode,
          backgroundColor: next.color,
          backgroundColor2: next.color2,
          backgroundImageUrl: next.imageUrl,
          backgroundStyleKey: next.styleKey
        }
      };
    });
  }

  function addSection(layout: BuilderTemplateLayout) {
    const newSection = createEmptySection(layout);
    setDraft((c) => ({ ...c, layoutSections: [...c.layoutSections, newSection] }));
    setCollapsedSectionIds((c) => [...c, newSection.id]);
  }
  function removeSection(sectionId: string) {
    setDraft((c) => ({ ...c, layoutSections: c.layoutSections.filter((s) => s.id !== sectionId) }));
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    setDraft((c) => {
      const idx = c.layoutSections.findIndex((s) => s.id === sectionId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= c.layoutSections.length) return c;
      const arr = [...c.layoutSections];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return { ...c, layoutSections: arr };
    });
  }

  function toggleSectionCollapsed(sectionId: string) {
    setCollapsedSectionIds((c) =>
      c.includes(sectionId) ? c.filter((id) => id !== sectionId) : [...c, sectionId]
    );
  }

  function addModuleFromPalette(sectionId: string, column: string, item: ModulePaletteItem) {
    const mod = createEmptyModule(item.type, column);
    updateSection(sectionId, (s) => ({
      ...s,
      modules: [...s.modules, { ...mod, name: item.name, text: item.text, settings: { ...mod.settings, ...item.settings } }]
    }));
  }

  function moveModule(sectionId: string, moduleId: string, direction: -1 | 1) {
    updateSection(sectionId, (s) => {
      const idx = s.modules.findIndex((m) => m.id === moduleId);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= s.modules.length) return s;
      const arr = [...s.modules];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return { ...s, modules: arr };
    });
  }

  function dropModule(
    moduleId: string,
    sourceSectionId: string,
    targetSectionId: string,
    targetColumn: string,
    targetBeforeModuleId?: string
  ) {
    setDraft((current) => {
      const sourceSection = current.layoutSections.find((section) => section.id === sourceSectionId);
      const targetSection = current.layoutSections.find((section) => section.id === targetSectionId);

      if (!sourceSection || !targetSection) {
        return current;
      }

      const sourceModule = sourceSection.modules.find((module) => module.id === moduleId);
      if (!sourceModule) {
        return current;
      }

      const movedModule: BuilderTemplateModule = {
        ...sourceModule,
        column: targetColumn
      };

      return {
        ...current,
        layoutSections: current.layoutSections.map((section) => {
          if (section.id !== sourceSectionId && section.id !== targetSectionId) {
            return section;
          }

          if (sourceSectionId === targetSectionId && section.id === sourceSectionId) {
            const remaining = section.modules.filter((module) => module.id !== moduleId);
            const insertAt = targetBeforeModuleId
              ? Math.max(remaining.findIndex((module) => module.id === targetBeforeModuleId), 0)
              : (() => {
                  const lastIndexInColumn = Math.max(
                    ...remaining
                      .map((module, index) => (module.column === targetColumn ? index : -1))
                      .filter((index) => index >= 0),
                    -1
                  );
                  return lastIndexInColumn >= 0 ? lastIndexInColumn + 1 : remaining.length;
                })();

            const nextModules = [...remaining];
            nextModules.splice(insertAt, 0, movedModule);
            return { ...section, modules: nextModules };
          }

          if (section.id === sourceSectionId) {
            return {
              ...section,
              modules: section.modules.filter((module) => module.id !== moduleId)
            };
          }

          const insertAt = targetBeforeModuleId
            ? Math.max(section.modules.findIndex((module) => module.id === targetBeforeModuleId), 0)
            : (() => {
                const lastIndexInColumn = Math.max(
                  ...section.modules
                    .map((module, index) => (module.column === targetColumn ? index : -1))
                    .filter((index) => index >= 0),
                  -1
                );
                return lastIndexInColumn >= 0 ? lastIndexInColumn + 1 : section.modules.length;
              })();

          const nextModules = [...section.modules];
          nextModules.splice(insertAt, 0, movedModule);
          return { ...section, modules: nextModules };
        })
      };
    });
  }

  function removeModule(sectionId: string, moduleId: string) {
    setExpandedModuleIds((c) => c.filter((id) => id !== moduleId));
    updateSection(sectionId, (s) => ({ ...s, modules: s.modules.filter((m) => m.id !== moduleId) }));
  }

  function toggleModuleExpanded(moduleId: string) {
    setExpandedModuleIds((c) =>
      c.includes(moduleId) ? c.filter((id) => id !== moduleId) : [...c, moduleId]
    );
  }

  // --- Template / page helpers ---

  function startNewTemplate() {
    setSelectedTemplateId("");
    setDraft(createDraftFromTemplate(null));
    setMessage(null);
    setError(null);
  }

  function startNewPage() {
    setSelectedPageId("");
    setPageSlug("");
    setPageTemplateId("");
    setIsPublishedPage(true);
    setDraft(createDraftFromPage(null));
    setMessage(null);
    setError(null);
  }

  function applyTemplateToPage(templateId: string) {
    setPageTemplateId(templateId);
    const template = pageTemplates.find((t) => t.id === templateId) ?? null;
    if (!template) { setDraft(createDraftFromPage(null)); return; }
    setDraft((c) => ({ id: selectedPageId, name: c.name || template.name, pageBackground: template.pageBackground, layoutSections: template.layoutSections }));
  }

  // --- Gallery / palette ---

  function openGallery(sectionId: string, moduleId: string) {
    setGalleryTarget({ kind: "module", sectionId, moduleId });
    setIsGalleryOpen(true);
  }

  function openSectionBackgroundGallery(sectionId: string) {
    setGalleryTarget({ kind: "section-background", sectionId });
    setIsGalleryOpen(true);
  }

  function openModulePalette(sectionId: string, column: string) {
    setModulePaletteTarget({ sectionId, column });
    setActiveModuleGroup(null);
    setIsModulePaletteOpen(true);
  }

  function closeGallery() { setIsGalleryOpen(false); setGalleryTarget(null); }
  function closeModulePalette() { setIsModulePaletteOpen(false); setModulePaletteTarget(null); setActiveModuleGroup(null); }

  function selectGalleryImage(imagePath: string) {
    if (!galleryTarget) return;
    if (galleryTarget.kind === "module") {
      updateModule(galleryTarget.sectionId, galleryTarget.moduleId, (c) => ({
        ...c, settings: { ...c.settings, url: normalizeBuilderAssetUrl(imagePath) }
      }));
    } else {
      updateSection(galleryTarget.sectionId, (c) => ({
        ...c, background: { ...c.background, mode: "image", imageUrl: normalizeBuilderAssetUrl(imagePath) }
      }));
    }
    closeGallery();
  }

  // --- Media upload ---

  async function uploadMedia(onSuccess: (media: AdminMediaItem) => void, file: File | null) {
    if (!file) return;
    setIsUploadingMedia(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const data = (await response.json()) as { media?: AdminMediaItem; error?: string };
      if (!response.ok || !data.media) throw new Error(data.error ?? "Failed to upload media.");
      const uploaded = data.media;
      setGalleryMedia((c) => [...c.filter((i) => i.path !== uploaded.path), uploaded].sort((a, b) => a.name.localeCompare(b.name)));
      onSuccess(uploaded);
      setMessage(`Uploaded ${uploaded.name} to /images/gallery.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload media.");
    } finally {
      setIsUploadingMedia(false);
    }
  }

  function uploadMediaForModule(sectionId: string, moduleId: string, file: File | null) {
    void uploadMedia((m) => {
      updateModule(sectionId, moduleId, (c) => ({ ...c, settings: { ...c.settings, url: normalizeBuilderAssetUrl(m.path) } }));
    }, file);
  }

  function uploadMediaForSectionBackground(sectionId: string, file: File | null) {
    void uploadMedia((m) => {
      updateSection(sectionId, (c) => ({ ...c, background: { ...c.background, mode: "image", imageUrl: normalizeBuilderAssetUrl(m.path) } }));
    }, file);
  }

  // --- CRUD ---

  async function saveTemplate() {
    if (!draft.name.trim()) { setError("Template name is required."); return; }
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(draft.id ? `/api/admin/page-templates/${draft.id}` : "/api/admin/page-templates", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, pageBackground: draft.pageBackground, layoutSections: draft.layoutSections })
      });
      const data = (await response.json()) as { pageTemplate?: BuilderTemplateRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to save template.");
      setMessage(draft.id ? "Page template updated." : "Page template created.");
      await loadPageTemplates();
      if (data.pageTemplate?.id) setSelectedTemplateId(data.pageTemplate.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template.");
    } finally { setIsSaving(false); }
  }

  async function savePage() {
    if (!draft.name.trim()) { setError("Page title is required."); return; }
    if (!pageSlug.trim()) { setError("Page slug is required."); return; }
    if (!pageTemplateId) { setError("Select a template before saving a page."); return; }
    setIsSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch(selectedPageId ? `/api/admin/pages/${selectedPageId}` : "/api/admin/pages", {
        method: selectedPageId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draft.name, slug: pageSlug, templateId: pageTemplateId, isPublished: isPublishedPage, pageBackground: draft.pageBackground, layoutSections: draft.layoutSections })
      });
      const data = (await response.json()) as { page?: BuilderPageRecord; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to save page.");
      setMessage(selectedPageId ? "Page updated." : "Page created.");
      await loadPages();
      if (data.page?.id) setSelectedPageId(data.page.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save page.");
    } finally { setIsSaving(false); }
  }

  async function deleteTemplateById(templateId: string, templateName: string) {
    if (!templateId) { setDraft(createDraftFromTemplate(null)); return; }
    if (!window.confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;
    setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/admin/page-templates/${templateId}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete template.");
      setMessage("Page template deleted.");
      if (selectedTemplateId === templateId) { setSelectedTemplateId(""); setDraft(createDraftFromTemplate(null)); }
      await loadPageTemplates();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete template."); }
  }

  async function deletePageById(pageId: string, pageName: string) {
    if (!pageId) { startNewPage(); return; }
    if (!window.confirm(`Delete page "${pageName}"? This cannot be undone.`)) return;
    setError(null); setMessage(null);
    try {
      const response = await fetch(`/api/admin/pages/${pageId}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete page.");
      setMessage("Page deleted.");
      if (selectedPageId === pageId) startNewPage();
      await loadPages();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete page."); }
  }

  // --- Preview ---

  function openPreviewPage() {
    window.localStorage.setItem(BUILDER_PREVIEW_STORAGE_KEY, JSON.stringify({ name: draft.name, pageBackground: draft.pageBackground, layoutSections: draft.layoutSections }));
    window.open(`${window.location.origin}/preview`, "_blank");
  }

  function openTemplatePreview(template: BuilderTemplateRecord) {
    window.localStorage.setItem(BUILDER_PREVIEW_STORAGE_KEY, JSON.stringify({ name: template.name, pageBackground: template.pageBackground, layoutSections: template.layoutSections }));
    window.open(`${window.location.origin}/preview`, "_blank");
  }

  function openPagePreview(slug: string) {
    if (slug) window.open(`/${slug}`, "_blank", "noopener,noreferrer");
  }

  // --- Drag & drop ---

  function handleLayoutDragStart(layout: BuilderTemplateLayout, event: DragEvent<HTMLButtonElement>) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", layout);
  }

  function handleWorkspaceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const layout = event.dataTransfer.getData("text/plain") as BuilderTemplateLayout;
    if (layout) addSection(layout);
    setDragOverWorkspace(false);
  }

  function renderLayoutTile(layout: { value: BuilderTemplateLayout; label: string }) {
    const columns = getLayoutColumns(layout.value);
    const gridTemplateColumns = getLayoutGridTemplate(layout.value);
    return (
      <button className="builder-layout-tile" draggable key={layout.value} onClick={() => addSection(layout.value)} onDragStart={(event) => handleLayoutDragStart(layout.value, event)} type="button">
        <span className={`builder-layout-icon builder-layout-icon-${columns.length}`} style={{ gridTemplateColumns }}>
          {columns.map((column) => (<span className="builder-layout-bar" key={column} />))}
        </span>
        <span className="builder-layout-label">{layout.label}</span>
      </button>
    );
  }

  // --- Render ---

  return (
    <section className="admin-section">
      <div className="admin-toolbar">
        <h2 className="admin-section-heading">Page Builder</h2>
        <div className="admin-actions builder-header-actions">
          <button className={builderMode === "templates" ? "submit-button" : "secondary-button"} onClick={() => setBuilderMode("templates")} type="button">Templates</button>
          <button className={builderMode === "pages" ? "submit-button" : "secondary-button"} onClick={() => setBuilderMode("pages")} type="button">Pages</button>
          <button className="secondary-button" onClick={openPreviewPage} type="button">Preview</button>
        </div>
      </div>

      {message ? <div className="notice success admin-notice">{message}</div> : null}
      {error ? <div className="notice error admin-notice">{error}</div> : null}

      {builderMode === "templates" ? (
        <BuilderTemplateList
          templates={pageTemplates}
          selectedTemplateId={selectedTemplateId}
          draftName={draft.name}
          isSaving={isSaving}
          onSelectTemplate={setSelectedTemplateId}
          onPreviewTemplate={openTemplatePreview}
          onDeleteTemplate={(id, name) => void deleteTemplateById(id, name)}
          onSetDraftName={setDraftName}
          onNewTemplate={startNewTemplate}
          onSaveTemplate={() => void saveTemplate()}
        />
      ) : (
        <BuilderPageList
          pages={pages}
          templates={pageTemplates}
          selectedPageId={selectedPageId}
          draftName={draft.name}
          pageSlug={pageSlug}
          pageTemplateId={pageTemplateId}
          isPublishedPage={isPublishedPage}
          isSaving={isSaving}
          onSelectPage={setSelectedPageId}
          onPreviewPage={openPagePreview}
          onDeletePage={(id, name) => void deletePageById(id, name)}
          onSetDraftName={setDraftName}
          onSetPageSlug={setPageSlug}
          onApplyTemplate={applyTemplateToPage}
          onSetIsPublished={setIsPublishedPage}
          onNewPage={startNewPage}
          onSavePage={() => void savePage()}
        />
      )}

      <BuilderBackgroundControls
        label="Page Background"
        background={draft.pageBackground}
        onChange={updatePageBackground}
        compact
      />

      <div className="builder-toolbar-shell">
        <div className="panel-label">Row Configurations</div>
        <div className="builder-layout-toolbar">
          {layoutOptions.map((layout) => renderLayoutTile(layout))}
        </div>
      </div>

      <div className="builder-toolbar-shell">
        <div className="panel-label">Workspace</div>
        <div
          className={`builder-main builder-workspace ${dragOverWorkspace ? "is-drag-over" : ""}`}
          style={getBuilderBackgroundStyle(draft.pageBackground)}
          onDragOver={(event) => { event.preventDefault(); setDragOverWorkspace(true); }}
          onDragLeave={() => setDragOverWorkspace(false)}
          onDrop={handleWorkspaceDrop}
        >
          {draft.layoutSections.length === 0 ? (
            <div className="builder-workspace-empty">
              <div className="builder-workspace-empty-title">Drop a row onto the workspace</div>
              <div className="builder-workspace-empty-copy">Drag a row configuration from the toolbar above, or click one to add it instantly.</div>
            </div>
          ) : (
            <div className="builder-sections">
              {draft.layoutSections.map((section, sectionIndex) => (
                <BuilderSectionCard
                  key={section.id}
                  section={section}
                  sectionIndex={sectionIndex}
                  isCollapsed={collapsedSectionIds.includes(section.id)}
                  expandedModuleIds={expandedModuleIds}
                  onToggleCollapsed={() => toggleSectionCollapsed(section.id)}
                  onMoveUp={() => moveSection(section.id, -1)}
                  onMoveDown={() => moveSection(section.id, 1)}
                  onRemove={() => removeSection(section.id)}
                  onUpdateSection={(updater) => updateSection(section.id, updater)}
                  onUpdateCellBackground={(col, updater) => updateCellBackground(section.id, col, updater)}
                  onUpdateCellPadding={(col, value) => updateCellPadding(section.id, col, value)}
                  onUpdateCellBorderWidth={(col, value) => updateCellBorderWidth(section.id, col, value)}
                  onUpdateCellBorderColor={(col, value) => updateCellBorderColor(section.id, col, value)}
                  onUpdateCellBorderRadius={(col, value) => updateCellBorderRadius(section.id, col, value)}
                  onToggleModuleExpanded={toggleModuleExpanded}
                  onUpdateModule={(moduleId, updater) => updateModule(section.id, moduleId, updater)}
                  onUpdateModuleBackground={(moduleId, updater) => updateModuleBackground(section.id, moduleId, updater)}
                  onMoveModule={(moduleId, dir) => moveModule(section.id, moduleId, dir)}
                  onDropModule={dropModule}
                  onRemoveModule={(moduleId) => removeModule(section.id, moduleId)}
                  onOpenGallery={(moduleId) => openGallery(section.id, moduleId)}
                  onUploadMediaForModule={(moduleId, file) => uploadMediaForModule(section.id, moduleId, file)}
                  onOpenSectionBackgroundGallery={() => openSectionBackgroundGallery(section.id)}
                  onUploadSectionBackgroundMedia={(file) => uploadMediaForSectionBackground(section.id, file)}
                  onOpenModulePalette={(col) => openModulePalette(section.id, col)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <BuilderTemplatePreview pageBackground={draft.pageBackground} layoutSections={draft.layoutSections} />

      {draft.id ? (
        <div className="builder-footer-actions">
          <button className="danger-button" onClick={() => void (builderMode === "templates" ? deleteTemplateById(draft.id, draft.name) : deletePageById(selectedPageId, draft.name))} type="button">
            {builderMode === "templates" ? "Delete Template" : "Delete Page"}
          </button>
        </div>
      ) : null}

      {isGalleryOpen ? (
        <BuilderGalleryModal
          media={galleryMedia}
          isUploading={isUploadingMedia}
          onSelectImage={selectGalleryImage}
          onClose={closeGallery}
        />
      ) : null}

      {isModulePaletteOpen ? (
        <BuilderModulePaletteModal
          activeGroup={activeModuleGroup}
          onSelectGroup={setActiveModuleGroup}
          onSelectItem={(item) => {
            if (!modulePaletteTarget) return;
            addModuleFromPalette(modulePaletteTarget.sectionId, modulePaletteTarget.column, item);
            closeModulePalette();
          }}
          onClose={closeModulePalette}
        />
      ) : null}
    </section>
  );
}
