"use client";

import { type Dispatch, type SetStateAction } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type {
  BuilderCellModuleRecord,
  BuilderPageRecord,
  BuilderProductRecord,
  BuilderSavedSectionRecord,
  BuilderTemplateModule,
  BuilderTemplateRecord,
  BuilderTemplateSection
} from "@/lib/builder-template";
import { inferModuleClassFromBuilderModules, resolveModuleClassForBuilderModule } from "@/lib/module-class-triggers";
import type { BuilderDraft } from "./builder-types";
import type { CreatedModuleSource } from "./builder-repository-helpers";

type UseBuilderPersistenceParams = {
  draft: BuilderDraft;
  selectedPageId: string;
  selectedTemplateId: string;
  pages: BuilderPageRecord[];
  pageTemplates: BuilderTemplateRecord[];
  cellModules: BuilderCellModuleRecord[];
  savedSections: BuilderSavedSectionRecord[];
  products: BuilderProductRecord[];
  setPageTemplates: Dispatch<SetStateAction<BuilderTemplateRecord[]>>;
  setPages: Dispatch<SetStateAction<BuilderPageRecord[]>>;
  setCellModules: Dispatch<SetStateAction<BuilderCellModuleRecord[]>>;
  setSavedSections: Dispatch<SetStateAction<BuilderSavedSectionRecord[]>>;
  setProducts: Dispatch<SetStateAction<BuilderProductRecord[]>>;
  setIsLoading: (value: boolean) => void;
  setIsSaving: (value: boolean) => void;
  setSelectedTemplateId: Dispatch<SetStateAction<string>>;
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setError: (value: string | null) => void;
  setMessage: (value: string | null) => void;
  promptForModuleClass: (fallbackClass?: string) => string | null;
};

/**
 * Repository persistence for the builder editor: loading and CRUD for
 * templates/pages/cell-modules/saved-sections/products and created
 * modules. Extracted verbatim from admin-builder-editor.tsx; the
 * template/page lifecycle (saveTemplate, savePage, delete/clone by id)
 * remains in the editor.
 */
export function useBuilderPersistence({
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
}: UseBuilderPersistenceParams) {
  async function loadPageTemplates() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/page-templates", { cache: "no-store" });
      const data = await readAdminJson<{ pageTemplates?: BuilderTemplateRecord[]; error?: string }>(response, "Failed to load page templates.");
      const templates = data.pageTemplates ?? [];
      setPageTemplates(templates);
      if (selectedTemplateId && !templates.some((t) => t.id === selectedTemplateId)) {
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
      const data = await readAdminJson<{ pages?: BuilderPageRecord[]; error?: string }>(response, "Failed to load pages.");
      const nextPages = data.pages ?? [];
      setPages(nextPages);
      if (!nextPages.some((p) => p.id === selectedPageId)) setSelectedPageId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pages.");
      setPages([]);
    }
  }

  async function loadCellModules() {
    try {
      const response = await fetch("/api/admin/cell-modules", { cache: "no-store" });
      const data = await readAdminJson<{ cellModules?: BuilderCellModuleRecord[]; error?: string }>(response, "Failed to load saved cell modules.");
      setCellModules(data.cellModules ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load saved cell modules.";
      if (!message.includes("builder_cell_modules")) {
        setError(message);
      }
      setCellModules([]);
    }
  }

  async function loadSavedSections() {
    try {
      const response = await fetch("/api/admin/saved-sections", { cache: "no-store" });
      const data = await readAdminJson<{ savedSections?: BuilderSavedSectionRecord[]; error?: string }>(response, "Failed to load saved sections.");
      setSavedSections(data.savedSections ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load saved sections.";
      if (!message.includes("builder_saved_sections")) {
        setError(message);
      }
      setSavedSections([]);
    }
  }

  async function loadProducts() {
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await readAdminJson<{ products?: BuilderProductRecord[]; error?: string }>(response, "Failed to load products.");
      setProducts(data.products ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load products.";
      if (!message.includes("products")) {
        setError(message);
      }
      setProducts([]);
    }
  }

  async function saveSection(sectionId: string) {
    const section = draft.layoutSections.find((candidate) => candidate.id === sectionId);

    if (!section) {
      return;
    }

    const fallbackName = section.title || `${draft.name || "Untitled"} section`;
    const name = window.prompt("Name this saved section", fallbackName)?.trim();

    if (!name) {
      return;
    }

    try {
      const response = await fetch("/api/admin/saved-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          section
        })
      });
      const data = await readAdminJson<{ savedSection?: BuilderSavedSectionRecord; error?: string }>(response, "Failed to save section.");

      if (!data.savedSection) {
        throw new Error(data.error ?? "Failed to save section.");
      }

      setSavedSections((current) => [data.savedSection!, ...current]);
      setMessage(`Saved "${data.savedSection.name}" to the section repository.`);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save section.");
    }
  }

  async function saveCellModules(sectionId: string, column: string) {
    const section = draft.layoutSections.find((candidate) => candidate.id === sectionId);
    const modules = section?.modules.filter((module) => module.column === column) ?? [];

    if (modules.length === 0) {
      setError("Cell has no modules to save.");
      return;
    }

    const fallbackName = `${draft.name || "Untitled"} ${column} cell`;
    const name = window.prompt("Name this saved cell module set", fallbackName)?.trim();

    if (!name) {
      return;
    }

    const moduleClass = promptForModuleClass("Layout");
    if (moduleClass === null) {
      return;
    }

    try {
      const response = await fetch("/api/admin/cell-modules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          moduleClass,
          modules
        })
      });
      const data = await readAdminJson<{ cellModule?: BuilderCellModuleRecord; error?: string }>(response, "Failed to save cell module.");

      if (!data.cellModule) {
        throw new Error(data.error ?? "Failed to save cell module.");
      }

      setCellModules((current) => [data.cellModule!, ...current]);
      setMessage(`Saved "${data.cellModule.name}" to the module repository.`);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save cell module.");
    }
  }

  async function saveModule(sectionId: string, moduleId: string) {
    const section = draft.layoutSections.find((s) => s.id === sectionId);
    const builderModule = section?.modules.find((m) => m.id === moduleId);
    if (!builderModule) return;

    const fallbackName = builderModule.name || builderModule.type;
    const name = window.prompt("Name this saved module", fallbackName)?.trim();
    if (!name) return;

    const moduleClass = promptForModuleClass(resolveModuleClassForBuilderModule(builderModule));
    if (moduleClass === null) return;

    try {
      const response = await fetch("/api/admin/cell-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, moduleClass, modules: [builderModule] })
      });
      const data = await readAdminJson<{ cellModule?: BuilderCellModuleRecord; error?: string }>(response, "Failed to save module.");
      if (!data.cellModule) throw new Error(data.error ?? "Failed to save module.");
      setCellModules((current) => [data.cellModule!, ...current]);
      setMessage(`Saved "${data.cellModule.name}" to the module repository.`);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save module.");
    }
  }

  async function saveSavedModule(cellModuleId: string, name: string, moduleClass: string, modules: BuilderTemplateModule[]) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/cell-modules/${cellModuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, moduleClass, modules })
      });
      const data = await readAdminJson<{ cellModule?: BuilderCellModuleRecord; error?: string }>(response, "Failed to save saved module.");

      if (!data.cellModule) {
        throw new Error(data.error ?? "Failed to save saved module.");
      }

      setCellModules((current) =>
        current.map((cellModule) => (cellModule.id === data.cellModule!.id ? data.cellModule! : cellModule))
      );
      setMessage(`Saved module "${data.cellModule.name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save saved module.");
    } finally {
      setIsSaving(false);
    }
  }

  function cloneSavedModules(modules: BuilderTemplateModule[]) {
    const timestamp = Date.now();
    return modules.map((module, index) => ({
      ...module,
      id: `${module.type}-${timestamp}-${index}`,
      settings: { ...module.settings }
    }));
  }

  async function cloneSavedModule(cellModuleId: string) {
    const source = cellModules.find((cellModule) => cellModule.id === cellModuleId);
    if (!source || source.modules.length === 0) {
      return;
    }

    const baseName = source.name?.trim() || "Untitled saved module";
    await createSavedModule(`${baseName} (copy)`, source.moduleClass?.trim() ?? "", cloneSavedModules(source.modules));
  }

  async function cloneCreatedModule(module: BuilderTemplateModule, moduleLabel: string) {
    const baseName = moduleLabel.trim() || module.name?.trim() || module.type;

    await createSavedModule(
      `${baseName} (copy)`,
      inferModuleClassFromBuilderModules([module]),
      cloneSavedModules([module])
    );
  }

  async function createSavedModule(name: string, moduleClass: string, modules: BuilderTemplateModule[]) {
    const trimmedName = name.trim();

    if (!trimmedName || modules.length === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/cell-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, moduleClass: moduleClass.trim(), modules })
      });
      const data = await readAdminJson<{ cellModule?: BuilderCellModuleRecord; error?: string }>(response, "Failed to save module.");

      if (!data.cellModule) {
        throw new Error(data.error ?? "Failed to save module.");
      }

      setCellModules((current) => [data.cellModule!, ...current]);
      setMessage(`Saved "${data.cellModule.name}" to the module repository.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSavedModule(cellModuleId: string, currentName: string) {
    if (!window.confirm(`Delete saved module "${currentName}"? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/cell-modules/${cellModuleId}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete saved module.");

      setCellModules((current) => current.filter((cellModule) => cellModule.id !== cellModuleId));
      setMessage(`Deleted saved module "${currentName}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete saved module.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSavedSection(sectionId: string, name: string, section: BuilderTemplateSection) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Saved section name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/saved-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, section })
      });
      const data = await readAdminJson<{ savedSection?: BuilderSavedSectionRecord; error?: string }>(response, "Failed to save saved section.");

      if (!data.savedSection) {
        throw new Error(data.error ?? "Failed to save saved section.");
      }

      setSavedSections((current) =>
        current.map((section) => (section.id === data.savedSection!.id ? data.savedSection! : section))
      );
      setMessage(`Saved section "${data.savedSection.name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save saved section.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSavedSection(sectionId: string, currentName: string) {
    if (!window.confirm(`Delete saved section "${currentName}"? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/saved-sections/${sectionId}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete saved section.");

      setSavedSections((current) => current.filter((section) => section.id !== sectionId));
      setMessage(`Deleted saved section "${currentName}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete saved section.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveProduct(product: Partial<BuilderProductRecord> & { id?: string }) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(product.id ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          productType: product.productType,
          productUrl: product.productUrl,
          imageUrl: product.imageUrl
        })
      });
      const data = await readAdminJson<{ product?: BuilderProductRecord; error?: string }>(response, "Failed to save product.");

      if (!data.product) {
        throw new Error(data.error ?? "Failed to save product.");
      }

      setProducts((current) =>
        product.id
          ? current.map((candidate) => (candidate.id === data.product!.id ? data.product! : candidate))
          : [data.product!, ...current]
      );
      setMessage(`Saved product "${data.product.name}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct(productId: string, currentName: string) {
    if (!window.confirm(`Delete product "${currentName}"? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      await readAdminJson<{ error?: string }>(response, "Failed to delete product.");

      setProducts((current) => current.filter((product) => product.id !== productId));
      setMessage(`Deleted product "${currentName}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete product.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveCreatedModule(source: CreatedModuleSource, nextModule: BuilderTemplateModule) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (source.kind === "template") {
        const template = pageTemplates.find((candidate) => candidate.id === source.sourceId);

        if (!template) {
          throw new Error("Could not find the source template for this module.");
        }

        const layoutSections = template.layoutSections.map((section) =>
          section.id === source.sectionId
            ? {
                ...section,
                modules: section.modules.map((module) => (module.id === source.moduleId ? nextModule : module))
              }
            : section
        );
        const response = await fetch(`/api/admin/page-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            pageBackground: template.pageBackground,
            layoutSections
          })
        });
        const data = await readAdminJson<{ pageTemplate?: BuilderTemplateRecord; error?: string }>(response, "Failed to save module.");

        if (!data.pageTemplate) {
          throw new Error(data.error ?? "Failed to save module.");
        }

        setPageTemplates((current) =>
          current.map((candidate) => (candidate.id === data.pageTemplate!.id ? data.pageTemplate! : candidate))
        );
      } else {
        const page = pages.find((candidate) => candidate.id === source.sourceId);

        if (!page) {
          throw new Error("Could not find the source page for this module.");
        }

        const layoutSections = page.layoutSections.map((section) =>
          section.id === source.sectionId
            ? {
                ...section,
                modules: section.modules.map((module) => (module.id === source.moduleId ? nextModule : module))
              }
            : section
        );
        const response = await fetch(`/api/admin/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: page.name,
            slug: page.slug,
            templateId: page.templateId,
            isPublished: page.isPublished,
            pageBackground: page.pageBackground,
            layoutSections
          })
        });
        const data = await readAdminJson<{ page?: BuilderPageRecord; error?: string }>(response, "Failed to save module.");

        if (!data.page) {
          throw new Error(data.error ?? "Failed to save module.");
        }

        setPages((current) => current.map((candidate) => (candidate.id === data.page!.id ? data.page! : candidate)));
      }

      setMessage("Module updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save module.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCreatedModule(source: CreatedModuleSource, moduleName: string) {
    if (!window.confirm(`Delete module "${moduleName}" from its source? This cannot be undone.`)) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (source.kind === "template") {
        const template = pageTemplates.find((candidate) => candidate.id === source.sourceId);

        if (!template) {
          throw new Error("Could not find the source template for this module.");
        }

        const layoutSections = template.layoutSections.map((section) =>
          section.id === source.sectionId
            ? { ...section, modules: section.modules.filter((module) => module.id !== source.moduleId) }
            : section
        );
        const response = await fetch(`/api/admin/page-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: template.name,
            pageBackground: template.pageBackground,
            layoutSections
          })
        });
        const data = await readAdminJson<{ pageTemplate?: BuilderTemplateRecord; error?: string }>(response, "Failed to delete module.");

        if (!data.pageTemplate) {
          throw new Error(data.error ?? "Failed to delete module.");
        }

        setPageTemplates((current) =>
          current.map((candidate) => (candidate.id === data.pageTemplate!.id ? data.pageTemplate! : candidate))
        );
      } else {
        const page = pages.find((candidate) => candidate.id === source.sourceId);

        if (!page) {
          throw new Error("Could not find the source page for this module.");
        }

        const layoutSections = page.layoutSections.map((section) =>
          section.id === source.sectionId
            ? { ...section, modules: section.modules.filter((module) => module.id !== source.moduleId) }
            : section
        );
        const response = await fetch(`/api/admin/pages/${page.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: page.name,
            slug: page.slug,
            templateId: page.templateId,
            isPublished: page.isPublished,
            pageBackground: page.pageBackground,
            layoutSections
          })
        });
        const data = await readAdminJson<{ page?: BuilderPageRecord; error?: string }>(response, "Failed to delete module.");

        if (!data.page) {
          throw new Error(data.error ?? "Failed to delete module.");
        }

        setPages((current) => current.map((candidate) => (candidate.id === data.page!.id ? data.page! : candidate)));
      }

      setMessage(`Deleted module "${moduleName}".`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete module.");
    } finally {
      setIsSaving(false);
    }
  }


  return {
    loadPageTemplates,
    loadPages,
    loadCellModules,
    loadSavedSections,
    loadProducts,
    saveSection,
    saveCellModules,
    saveModule,
    saveSavedModule,
    cloneSavedModules,
    cloneSavedModule,
    cloneCreatedModule,
    createSavedModule,
    deleteSavedModule,
    saveSavedSection,
    deleteSavedSection,
    saveProduct,
    deleteProduct,
    saveCreatedModule,
    deleteCreatedModule
  };
}
