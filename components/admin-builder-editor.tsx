"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminMediaItem } from "@/lib/admin-media";
import { BUILDER_PREVIEW_DEVICE_STORAGE_KEY, BUILDER_PREVIEW_STORAGE_KEY, type BuilderCellModuleRecord, type BuilderPageRecord, type BuilderProductRecord, type BuilderSavedSectionRecord, type BuilderTemplateRecord } from "@/lib/builder-template";
import { getDefaultEmailTemplateName } from "@/lib/builder-email-template";

import type { BuilderModalAnchor } from "@/lib/builder-anchored-modal";

import type { GalleryTarget, ModulePaletteGroup } from "./builder/builder-types";
import { buildClonedPageCreatePayload, createDraftFromTemplate, createDraftFromPage } from "./builder/builder-utils";
import { BuilderTemplateList } from "./builder/builder-template-list";
import { BuilderPageList } from "./builder/builder-page-list";
import { BuilderModuleRepositoryList, type BuilderModuleEditorFocus } from "./builder/builder-module-repository-list";
import { BuilderFloatingSaveRail, type BuilderFloatingSaveAction } from "./builder/builder-floating-save-rail";
import { BuilderSaveDebugPanel } from "./builder/builder-save-debug-panel";
import { BuilderGalleryModal } from "./builder/builder-gallery-modal";
import { BuilderModulePaletteModal, type ModulePaletteAnchor } from "./builder/builder-module-palette-modal";
import { AdminLegacyRemindersImportPanel } from "@/components/admin-legacy-reminders-import-panel";
import { useBuilderDraftOps } from "./builder/use-builder-draft-ops";
import { useBuilderPersistence } from "./builder/use-builder-persistence";
import { useBuilderMediaModals } from "./builder/use-builder-media-modals";
import { BuilderWorkspacePanel } from "./builder/builder-workspace-panel";

type AdminApiPayload = {
  error?: string;
};

async function readAdminJson<T extends AdminApiPayload>(response: Response, fallbackMessage: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    const preview = text.replace(/\s+/g, " ").trim().slice(0, 160);
    throw new Error(
      `${fallbackMessage} ${response.url || "Request"} returned ${response.status} ${response.statusText || "non-JSON"}: ${preview || "No response body."}`
    );
  }

  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(data.error ?? fallbackMessage);
  }

  return data;
}

export function AdminBuilderEditor() {
  const [builderMode, setBuilderMode] = useState<"templates" | "modules" | "pages">("templates");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [pageTemplates, setPageTemplates] = useState<BuilderTemplateRecord[]>([]);
  const [pages, setPages] = useState<BuilderPageRecord[]>([]);
  const [cellModules, setCellModules] = useState<BuilderCellModuleRecord[]>([]);
  const [savedSections, setSavedSections] = useState<BuilderSavedSectionRecord[]>([]);
  const [products, setProducts] = useState<BuilderProductRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageTemplateId, setPageTemplateId] = useState("");
  const [isPublishedPage, setIsPublishedPage] = useState(true);
  const [draft, setDraft] = useState(createDraftFromTemplate(null));
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<string[]>([]);
  const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);
  const [pageEditorFocused, setPageEditorFocused] = useState(false);
  const [templateEditorFocused, setTemplateEditorFocused] = useState(false);
  const [repositorySaveFocus, setRepositorySaveFocus] = useState<BuilderModuleEditorFocus | null>(null);
  const [repositorySaveActive, setRepositorySaveActive] = useState(false);
  const repositorySaveRef = useRef<BuilderModuleEditorFocus | null>(null);
  const hydratedPageSelectionRef = useRef("");
  const hydratedTemplateSelectionRef = useRef("");
  const [galleryMedia, setGalleryMedia] = useState<AdminMediaItem[]>([]);
  const [, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isModulePaletteOpen, setIsModulePaletteOpen] = useState(false);
  const [galleryTarget, setGalleryTarget] = useState<GalleryTarget | null>(null);
  const [galleryAnchor, setGalleryAnchor] = useState<BuilderModalAnchor | null>(null);
  const [modulePaletteTarget, setModulePaletteTarget] = useState<{ sectionId: string; column: string } | null>(null);
  const [modulePaletteAnchor, setModulePaletteAnchor] = useState<ModulePaletteAnchor | null>(null);
  const [activeModuleGroup, setActiveModuleGroup] = useState<ModulePaletteGroup | null>(null);
  const [collapsedBuilderPanels, setCollapsedBuilderPanels] = useState({
    rowConfigurations: true,
    rows: false,
    workspace: true
  });
  const [savedSectionSelectKey, setSavedSectionSelectKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // --- Derived values ---

  const pageLayoutTemplates = useMemo(
    () => pageTemplates.filter((template) => template.templateKind !== "email"),
    [pageTemplates]
  );
  const isEmailTemplateDraft = builderMode === "templates" && draft.templateKind === "email";

  useEffect(() => {
    async function loadMediaLibrary() {
      try {
        const response = await fetch("/api/admin/media", { cache: "no-store" });
        const data = await readAdminJson<{ media?: AdminMediaItem[]; error?: string }>(response, "Failed to load media gallery.");
        setGalleryMedia(data.media ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load media gallery.");
      }
    }
    void loadMediaLibrary();
  }, []);

  useEffect(() => {
    if (builderMode !== "templates") {
      return;
    }

    if (!selectedTemplateId) {
      return;
    }

    const template = pageTemplates.find((template) => template.id === selectedTemplateId) ?? null;

    if (!template) {
      return;
    }

    if (hydratedTemplateSelectionRef.current === selectedTemplateId) {
      return;
    }

    hydratedTemplateSelectionRef.current = selectedTemplateId;
    setDraft(createDraftFromTemplate(template));
    setCollapsedSectionIds(template.layoutSections.map((section) => section.id));
  }, [builderMode, selectedTemplateId, pageTemplates]);

  useEffect(() => {
    if (builderMode !== "pages") {
      return;
    }

    const selectionKey = selectedPageId || "__new__";
    const page = selectedPageId ? pages.find((entry) => entry.id === selectedPageId) ?? null : null;

    if (selectedPageId && !page) {
      return;
    }

    if (hydratedPageSelectionRef.current === selectionKey) {
      return;
    }

    hydratedPageSelectionRef.current = selectionKey;
    setDraft(createDraftFromPage(page));
    setPageSlug(page?.slug ?? "");
    setPageTemplateId(page?.templateId ?? "");
    setIsPublishedPage(page?.isPublished ?? true);
    setCollapsedSectionIds(page?.layoutSections.map((section) => section.id) ?? []);
  }, [builderMode, selectedPageId, pages]);

  // Editor focus bookkeeping on mode/selection changes, adjusted during
  // render instead of setState-in-effect cascades. The repository-save ref
  // clear stays in the effect below (refs must not be written during render).
  const [prevFocusKey, setPrevFocusKey] = useState({ builderMode, selectedPageId, selectedTemplateId });

  if (
    prevFocusKey.builderMode !== builderMode ||
    prevFocusKey.selectedPageId !== selectedPageId ||
    prevFocusKey.selectedTemplateId !== selectedTemplateId
  ) {
    const modeChanged = prevFocusKey.builderMode !== builderMode;
    const pageSelectionChanged = prevFocusKey.selectedPageId !== selectedPageId;
    const templateSelectionChanged = prevFocusKey.selectedTemplateId !== selectedTemplateId;
    setPrevFocusKey({ builderMode, selectedPageId, selectedTemplateId });

    if (modeChanged) {
      if (builderMode !== "pages") {
        setPageEditorFocused(false);
      }

      if (builderMode !== "templates") {
        setTemplateEditorFocused(false);
      }

      if (builderMode !== "modules") {
        setRepositorySaveFocus(null);
        setRepositorySaveActive(false);
      }
    }

    if ((modeChanged || pageSelectionChanged) && builderMode === "pages" && selectedPageId) {
      setPageEditorFocused(true);
    }

    if ((modeChanged || templateSelectionChanged) && builderMode === "templates" && selectedTemplateId) {
      setTemplateEditorFocused(true);
    }
  }

  useEffect(() => {
    if (builderMode !== "modules") {
      repositorySaveRef.current = null;
    }
  }, [builderMode]);

  const draftOps = useBuilderDraftOps({
    setDraft,
    cellModules,
    savedSections,
    setCollapsedSectionIds,
    setExpandedModuleIds,
    setCollapsedBuilderPanels,
    setSavedSectionSelectKey,
    setError,
    setMessage
  });
  const {
    setDraftName,
    setTemplateKind,
    setEmailFunction,
    updatePageBackground,
    updateSection,
    updateModule,
    addModuleFromPalette,
    promptForModuleClass,
    insertSavedModule } = draftOps;

  const {
    loadPageTemplates,
    loadPages,
    loadCellModules,
    loadSavedSections,
    loadProducts,
    saveSection,
    saveCellModules,
    saveModule,
    saveSavedModule,
    cloneSavedModule,
    cloneCreatedModule,
    createSavedModule,
    deleteSavedModule,
    saveSavedSection,
    deleteSavedSection,
    saveCreatedModule,
    deleteCreatedModule
  } = useBuilderPersistence({
    draft,
    selectedPageId,
    selectedTemplateId,
    pages,
    pageTemplates,
    cellModules,
    savedSections,
    products,
    setPageTemplates,
    setPages,
    setCellModules,
    setSavedSections,
    setProducts,
    setIsLoading,
    setIsSaving,
    setSelectedTemplateId,
    setSelectedPageId,
    setError,
    setMessage,
    promptForModuleClass
  });

  const mediaModals = useBuilderMediaModals({
    galleryTarget,
    setGalleryTarget,
    setGalleryAnchor,
    setIsGalleryOpen,
    setIsModulePaletteOpen,
    setModulePaletteTarget,
    setModulePaletteAnchor,
    setActiveModuleGroup,
    setGalleryMedia,
    setError,
    setMessage,
    updateModule,
    updateSection
  });
  const {
    closeGallery,
    closeModulePalette,
    selectGalleryImage } = mediaModals;

  // --- Data loading ---

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadPageTemplates(); void loadPages(); void loadCellModules(); void loadSavedSections(); void loadProducts(); }, []);

  // Prune collapse/expand bookkeeping when sections or modules are removed
  // from the draft (adjust-during-render).
  const [prevLayoutSections, setPrevLayoutSections] = useState(draft.layoutSections);

  if (prevLayoutSections !== draft.layoutSections) {
    setPrevLayoutSections(draft.layoutSections);
    setCollapsedSectionIds((c) => c.filter((id) => draft.layoutSections.some((s) => s.id === id)));
    setExpandedModuleIds((c) =>
      c.filter((id) => draft.layoutSections.some((s) => s.modules.some((m) => m.id === id)))
    );
  }

  // --- Draft mutations ---

  // --- Template / page helpers ---

  function startNewTemplate() {
    hydratedTemplateSelectionRef.current = "";
    setSelectedTemplateId("");
    setDraft(createDraftFromTemplate(null));
    setMessage(null);
    setError(null);
  }

  function startNewPage() {
    hydratedPageSelectionRef.current = "";
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
    const template = pageLayoutTemplates.find((t) => t.id === templateId) ?? null;
    if (!template) { setDraft(createDraftFromPage(null)); return; }
    setDraft((c) => ({ id: selectedPageId, name: c.name || template.name, templateKind: "modular", emailFunction: "", pageBackground: template.pageBackground, layoutSections: template.layoutSections }));
  }

  async function makeTemplateFromPage() {
    if (!draft.name.trim()) { setError("Page title is required before making a template."); return; }

    const templateName = `${draft.name.trim()} Template`;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/page-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          pageBackground: draft.pageBackground,
          layoutSections: draft.layoutSections
        })
      });
      const data = await readAdminJson<{ pageTemplate?: BuilderTemplateRecord; error?: string }>(response, "Failed to create template from page.");

      if (!data.pageTemplate) {
        throw new Error(data.error ?? "Failed to create template from page.");
      }

      await loadPageTemplates();
      setSelectedTemplateId(data.pageTemplate.id);
      setBuilderMode("templates");
      setMessage(`Created template "${data.pageTemplate.name}" from this page.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template from page.");
    } finally {
      setIsSaving(false);
    }
  }

  // --- Gallery / palette ---

  // --- Media upload ---

  // --- CRUD ---

  async function saveTemplate() {
    const resolvedName =
      draft.name.trim() ||
      (draft.templateKind === "email" ? getDefaultEmailTemplateName(draft.emailFunction) : "");

    if (!resolvedName) {
      setError("Template name is required.");
      return;
    }

    if (draft.templateKind === "email" && !draft.emailFunction) {
      setError("Select a Function for email templates.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(draft.id ? `/api/admin/page-templates/${draft.id}` : "/api/admin/page-templates", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resolvedName,
          templateKind: draft.templateKind,
          emailFunction: draft.emailFunction,
          pageBackground: draft.pageBackground,
          layoutSections: draft.layoutSections
        })
      });
      const data = await readAdminJson<{ pageTemplate?: BuilderTemplateRecord; error?: string }>(response, "Failed to save template.");
      setMessage(draft.id ? "Page template updated." : "Page template created.");
      if (data.pageTemplate?.id) {
        setSelectedTemplateId(data.pageTemplate.id);
      }
      await loadPageTemplates();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save template.");
    } finally {
      setIsSaving(false);
    }
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
      const data = await readAdminJson<{ page?: BuilderPageRecord; error?: string }>(response, "Failed to save page.");
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
      await readAdminJson<{ error?: string }>(response, "Failed to delete template.");
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
      await readAdminJson<{ error?: string }>(response, "Failed to delete page.");
      setMessage("Page deleted.");
      if (selectedPageId === pageId) startNewPage();
      await loadPages();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to delete page."); }
  }

  async function clonePageById(pageId: string) {
    const source = pages.find((page) => page.id === pageId);

    if (!source) {
      setError("Page not found.");
      return;
    }

    const payload = buildClonedPageCreatePayload(source, pages);

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await readAdminJson<{ page?: BuilderPageRecord; error?: string }>(response, "Failed to clone page.");

      if (!data.page?.id) {
        throw new Error(data.error ?? "Failed to clone page.");
      }

      hydratedPageSelectionRef.current = "";
      setSelectedPageId(data.page.id);
      setMessage(`Cloned page "${payload.name}".`);
      await loadPages();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clone page.");
    } finally {
      setIsSaving(false);
    }
  }

  // --- Preview ---

  function openPreviewPage() {
    window.localStorage.setItem(BUILDER_PREVIEW_STORAGE_KEY, JSON.stringify({ name: draft.name, pageBackground: draft.pageBackground, layoutSections: draft.layoutSections }));
    window.localStorage.setItem(
      BUILDER_PREVIEW_DEVICE_STORAGE_KEY,
      isEmailTemplateDraft ? "email" : previewDevice
    );
    window.open(`${window.location.origin}/preview`, "_blank");
  }

  function openTemplatePreview(template: BuilderTemplateRecord) {
    window.localStorage.setItem(BUILDER_PREVIEW_STORAGE_KEY, JSON.stringify({ name: template.name, pageBackground: template.pageBackground, layoutSections: template.layoutSections }));
    window.localStorage.setItem(
      BUILDER_PREVIEW_DEVICE_STORAGE_KEY,
      template.templateKind === "email" ? "email" : previewDevice
    );
    window.open(`${window.location.origin}/preview`, "_blank");
  }

  function openPagePreview(slug: string) {
    if (slug) window.open(`/${slug}`, "_blank", "noopener,noreferrer");
  }

  // --- Drag & drop ---

  const handleModuleEditorFocusChange = useCallback(
    (focus: BuilderModuleEditorFocus | null, syncOnly = false) => {
      repositorySaveRef.current = focus;

      if (!syncOnly) {
        setRepositorySaveFocus(focus);
      }
    },
    []
  );

  const handleRepositoryEditingActiveChange = useCallback((active: boolean) => {
    setRepositorySaveActive(active);

    if (!active) {
      repositorySaveRef.current = null;
      setRepositorySaveFocus(null);
    }
  }, []);

  const floatingSaveActions: BuilderFloatingSaveAction[] = (() => {
    if (builderMode === "pages" && (pageEditorFocused || Boolean(selectedPageId))) {
      return [
        {
          label: "Save Page",
          savingLabel: "Saving...",
          onSave: () => void savePage()
        }
      ];
    }

    if (builderMode === "templates" && (templateEditorFocused || Boolean(selectedTemplateId))) {
      return [
        {
          label: "Save Template",
          savingLabel: "Saving...",
          onSave: () => void saveTemplate()
        }
      ];
    }

    if (builderMode === "modules" && repositorySaveActive) {
      const activeFocus = repositorySaveRef.current ?? repositorySaveFocus;

      if (activeFocus?.kind === "section") {
        return [
          {
            label: "Save Section",
            savingLabel: "Saving...",
            onSave: () => {
              const focus = repositorySaveRef.current;

              if (!focus || focus.kind !== "section") {
                return;
              }

              void saveSavedSection(focus.sectionId, focus.name, focus.section);
            }
          }
        ];
      }

      return [
        {
          label: "Save Module",
          savingLabel: "Saving...",
          onSave: () => {
            const focus = repositorySaveRef.current;

            if (!focus) {
              return;
            }

            if (focus.kind === "created") {
              void saveCreatedModule(focus.source, focus.module);
              return;
            }

            if (focus.kind === "saved") {
              void saveSavedModule(focus.cellModuleId, focus.name, focus.moduleClass, focus.modules);
            }
          }
        }
      ];
    }

    return [];
  })();

  // --- Render ---

  return (
    <section
      className={`admin-section builder-editor-section${builderMode === "modules" ? " builder-editor-section-modules" : ""}`}
    >
      <div className="builder-editor-layout">
        <div className="builder-editor-layout-main">
      <div className="admin-toolbar">
        <h2 className="admin-section-heading">Page Builder</h2>
        <div className="admin-actions builder-header-actions">
          <button className={builderMode === "templates" ? "submit-button" : "secondary-button"} onClick={() => setBuilderMode("templates")} type="button">Templates</button>
          <button className={builderMode === "modules" ? "submit-button" : "secondary-button"} onClick={() => setBuilderMode("modules")} type="button">Modules</button>
          <button className={builderMode === "pages" ? "submit-button" : "secondary-button"} onClick={() => setBuilderMode("pages")} type="button">Pages</button>
        </div>
      </div>

      {message ? <div className="notice success admin-notice">{message}</div> : null}
      {error ? <div className="notice error admin-notice">{error}</div> : null}

      {builderMode === "pages" ? (
        <AdminLegacyRemindersImportPanel
          pageSlug={pageSlug}
          selectedPageId={selectedPageId}
          onPageImported={(page) => {
            setPages((current) => {
              const index = current.findIndex((entry) => entry.id === page.id);

              if (index < 0) {
                return [...current, page];
              }

              const next = [...current];
              next[index] = page;
              return next;
            });

            if (selectedPageId === page.id) {
              setDraft((current) => ({
                ...current,
                name: page.name,
                pageBackground: page.pageBackground,
                layoutSections: page.layoutSections
              }));
              setPageSlug(page.slug);
              setIsPublishedPage(page.isPublished);
              setPageTemplateId(page.templateId ?? "");
            }

            setMessage("Legacy reminders imported into the home page layout. Review the Reminders module, then Save Page.");
            setError(null);
          }}
        />
      ) : null}

      {builderMode === "templates" ? (
        <BuilderTemplateList
          templates={pageTemplates}
          selectedTemplateId={selectedTemplateId}
          draftName={draft.name}
          templateKind={draft.templateKind}
          emailFunction={draft.emailFunction}
          pageBackground={draft.pageBackground}
          previewDevice={previewDevice}
          isSaving={isSaving}
          onSelectTemplate={setSelectedTemplateId}
          onPreviewTemplate={openTemplatePreview}
          onDeleteTemplate={(id, name) => void deleteTemplateById(id, name)}
          onSetDraftName={setDraftName}
          onSetTemplateKind={setTemplateKind}
          onSetEmailFunction={setEmailFunction}
          onUpdatePageBackground={updatePageBackground}
          onSetPreviewDevice={setPreviewDevice}
          onPreviewDraft={openPreviewPage}
          onNewTemplate={startNewTemplate}
          onTemplateEditorFocus={setTemplateEditorFocused}
        />
      ) : builderMode === "modules" ? (
        <BuilderModuleRepositoryList
          cellModules={cellModules}
          pages={pages}
          products={products}
          galleryMedia={galleryMedia}
          savedSections={savedSections}
          templates={pageTemplates}
          isSaving={isSaving}
          onDeleteCreatedModule={(source, name) => void deleteCreatedModule(source, name)}
          onDeleteSavedModule={(id, name) => void deleteSavedModule(id, name)}
          onDeleteSavedSection={(id, name) => void deleteSavedSection(id, name)}
          onCloneCreatedModule={(module, moduleLabel) => void cloneCreatedModule(module, moduleLabel)}
          onCloneSavedModule={(id) => void cloneSavedModule(id)}
          onCreateSavedModule={(name, moduleClass, modules) => void createSavedModule(name, moduleClass, modules)}
          onSaveCreatedModule={(source, module) => void saveCreatedModule(source, module)}
          onSaveSavedModule={(id, name, moduleClass, modules) => void saveSavedModule(id, name, moduleClass, modules)}
          onSaveSavedSection={(id, name, section) => void saveSavedSection(id, name, section)}
          onModuleEditorFocusChange={handleModuleEditorFocusChange}
          onRepositoryEditingActiveChange={handleRepositoryEditingActiveChange}
        />
      ) : (
        <BuilderPageList
          pages={pages}
          templates={pageLayoutTemplates}
          selectedPageId={selectedPageId}
          draftName={draft.name}
          pageBackground={draft.pageBackground}
          pageSlug={pageSlug}
          pageTemplateId={pageTemplateId}
          isPublishedPage={isPublishedPage}
          isSaving={isSaving}
          onSelectPage={setSelectedPageId}
          onPreviewPage={openPagePreview}
          onClonePage={(id) => void clonePageById(id)}
          onDeletePage={(id, name) => void deletePageById(id, name)}
          onSetDraftName={setDraftName}
          onUpdatePageBackground={updatePageBackground}
          onSetPageSlug={setPageSlug}
          onApplyTemplate={applyTemplateToPage}
          onSetIsPublished={setIsPublishedPage}
          onNewPage={startNewPage}
          onPreviewDraft={openPreviewPage}
          onMakeTemplate={() => void makeTemplateFromPage()}
          onPageEditorFocus={setPageEditorFocused}
          onSavePage={() => void savePage()}
        />
      )}

      {builderMode !== "modules" ? (
        <BuilderWorkspacePanel
          draft={draft}
          isEmailTemplateDraft={isEmailTemplateDraft}
          previewDevice={previewDevice}
          collapsedBuilderPanels={collapsedBuilderPanels}
          collapsedSectionIds={collapsedSectionIds}
          expandedModuleIds={expandedModuleIds}
          cellModules={cellModules}
          savedSections={savedSections}
          products={products}
          savedSectionSelectKey={savedSectionSelectKey}
          draftOps={draftOps}
          mediaModals={mediaModals}
          saveSection={saveSection}
          saveCellModules={saveCellModules}
          saveModule={saveModule}
        />
      ) : null}


      {builderMode !== "modules" && draft.id ? (
        <div className="builder-footer-actions">
          <button className="danger-button" onClick={() => void (builderMode === "templates" ? deleteTemplateById(draft.id, draft.name) : deletePageById(selectedPageId, draft.name))} type="button">
            {builderMode === "templates" ? "Delete Template" : "Delete Page"}
          </button>
        </div>
      ) : null}

      {isGalleryOpen ? (
        <BuilderGalleryModal
          anchor={galleryTarget?.kind === "rich-text" ? galleryAnchor : null}
          onSelectImage={selectGalleryImage}
          onClose={closeGallery}
        />
      ) : null}

      {isModulePaletteOpen ? (
        <BuilderModulePaletteModal
          activeGroup={activeModuleGroup}
          anchor={modulePaletteAnchor}
          cellModules={cellModules}
          onSelectGroup={setActiveModuleGroup}
          onSelectItem={(item) => {
            if (!modulePaletteTarget) return;
            addModuleFromPalette(modulePaletteTarget.sectionId, modulePaletteTarget.column, item);
            closeModulePalette();
          }}
          onSelectSavedModule={(cellModuleId) => {
            if (!modulePaletteTarget) return;
            insertSavedModule(modulePaletteTarget.sectionId, modulePaletteTarget.column, cellModuleId);
            closeModulePalette();
          }}
          onClose={closeModulePalette}
        />
      ) : null}
        </div>
      </div>
      {floatingSaveActions.length > 0 ? (
        <BuilderFloatingSaveRail actions={floatingSaveActions} isSaving={isSaving} />
      ) : null}
      <BuilderSaveDebugPanel
        builderMode={builderMode}
        floatingActionCount={floatingSaveActions.length}
        floatingActionLabel={floatingSaveActions[0]?.label ?? ""}
        pageEditorFocused={pageEditorFocused}
        repositorySaveActive={repositorySaveActive}
        repositorySaveFocus={repositorySaveFocus}
        repositorySaveRefFocus={repositorySaveRef.current}
        selectedPageId={selectedPageId}
        selectedTemplateId={selectedTemplateId}
        templateEditorFocused={templateEditorFocused}
      />
    </section>
  );
}
