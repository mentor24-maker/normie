import { describe, expect, it } from "vitest";
import type { SetStateAction } from "react";
import { useBuilderDraftOps, type BuilderPanelKey } from "./use-builder-draft-ops";
import { createDraftFromTemplate } from "./builder-utils";
import type { BuilderDraft } from "./builder-types";
import { getLayoutColumns } from "@/lib/builder-template";

function apply<T>(action: SetStateAction<T>, current: T): T {
  return typeof action === "function" ? (action as (c: T) => T)(current) : action;
}

function createHarness() {
  const state = {
    draft: createDraftFromTemplate(null) as BuilderDraft,
    collapsedSectionIds: [] as string[],
    expandedModuleIds: [] as string[],
    panels: { rowConfigurations: true, rows: false, workspace: true } as Record<BuilderPanelKey, boolean>,
    savedSectionSelectKey: 0,
    error: null as string | null,
    message: null as string | null
  };

  // The hook contains no React primitives, so it can be exercised as a
  // plain closure factory with a mutable state harness.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const ops = useBuilderDraftOps({
    setDraft: (a) => {
      state.draft = apply(a, state.draft);
    },
    cellModules: [],
    savedSections: [],
    setCollapsedSectionIds: (a) => {
      state.collapsedSectionIds = apply(a, state.collapsedSectionIds);
    },
    setExpandedModuleIds: (a) => {
      state.expandedModuleIds = apply(a, state.expandedModuleIds);
    },
    setCollapsedBuilderPanels: (a) => {
      state.panels = apply(a, state.panels);
    },
    setSavedSectionSelectKey: (a) => {
      state.savedSectionSelectKey = apply(a, state.savedSectionSelectKey);
    },
    setError: (v) => {
      state.error = v;
    },
    setMessage: (v) => {
      state.message = v;
    }
  });

  return { state, ops };
}

describe("useBuilderDraftOps sections", () => {
  it("adds a section and collapses it by default", () => {
    const { state, ops } = createHarness();
    const before = state.draft.layoutSections.length;

    ops.addSection("single");

    expect(state.draft.layoutSections).toHaveLength(before + 1);
    const added = state.draft.layoutSections.at(-1)!;
    expect(state.collapsedSectionIds).toContain(added.id);
  });

  it("removes a section", () => {
    const { state, ops } = createHarness();
    ops.addSection("single");
    const id = state.draft.layoutSections.at(-1)!.id;

    ops.removeSection(id);

    expect(state.draft.layoutSections.some((s) => s.id === id)).toBe(false);
  });

  it("clones a section with fresh section and module ids", () => {
    const { state, ops } = createHarness();
    ops.addSection("single");
    const source = state.draft.layoutSections.at(-1)!;
    ops.addModuleFromPalette(source.id, getLayoutColumns(source.layout)[0], { type: "heading", label: "Heading" } as never);
    const sourceModules = state.draft.layoutSections.find((s) => s.id === source.id)!.modules;

    ops.cloneSection(source.id);

    const clone = state.draft.layoutSections.at(
      state.draft.layoutSections.findIndex((s) => s.id === source.id) + 1
    )!;
    expect(clone.id).not.toBe(source.id);
    expect(clone.modules).toHaveLength(sourceModules.length);
    for (const m of clone.modules) {
      expect(sourceModules.some((sm) => sm.id === m.id)).toBe(false);
    }
  });

  it("moves a section", () => {
    const { state, ops } = createHarness();
    ops.addSection("single");
    ops.addSection("single");
    const [a, b] = state.draft.layoutSections.slice(-2).map((s) => s.id);

    ops.moveSection(b, -1);

    const ids = state.draft.layoutSections.map((s) => s.id);
    expect(ids.indexOf(b)).toBe(ids.indexOf(a) - 1);
  });

  it("toggles section collapse", () => {
    const { state, ops } = createHarness();
    ops.addSection("single");
    const id = state.draft.layoutSections.at(-1)!.id;
    expect(state.collapsedSectionIds).toContain(id);

    ops.toggleSectionCollapsed(id);
    expect(state.collapsedSectionIds).not.toContain(id);

    ops.toggleSectionCollapsed(id);
    expect(state.collapsedSectionIds).toContain(id);
  });
});

describe("useBuilderDraftOps modules", () => {
  function withModule() {
    const h = createHarness();
    h.ops.addSection("single");
    const section = h.state.draft.layoutSections.at(-1)!;
    h.ops.addModuleFromPalette(section.id, getLayoutColumns(section.layout)[0], { type: "text", label: "Text" } as never);
    const mod = h.state.draft.layoutSections.find((s) => s.id === section.id)!.modules[0];
    return { ...h, sectionId: section.id, moduleId: mod.id };
  }

  it("adds a module from the palette", () => {
    const { state, sectionId } = withModule();
    expect(state.draft.layoutSections.find((s) => s.id === sectionId)!.modules).toHaveLength(1);
  });

  it("updates a module via updater", () => {
    const { state, ops, sectionId, moduleId } = withModule();

    ops.updateModule(sectionId, moduleId, (m) => ({ ...m, settings: { ...m.settings, text: "hello" } }));

    const mod = state.draft.layoutSections.find((s) => s.id === sectionId)!.modules[0];
    expect(mod.settings.text).toBe("hello");
  });

  it("clones a module with a fresh id, inserted after the source", () => {
    const { state, ops, sectionId, moduleId } = withModule();

    ops.cloneModule(sectionId, moduleId);

    const modules = state.draft.layoutSections.find((s) => s.id === sectionId)!.modules;
    expect(modules).toHaveLength(2);
    expect(modules[1].id).not.toBe(moduleId);
    expect(modules[1].type).toBe(modules[0].type);
  });

  it("removes a module and its expansion bookkeeping", () => {
    const { state, ops, sectionId, moduleId } = withModule();
    ops.toggleModuleExpanded(moduleId);
    expect(state.expandedModuleIds).toContain(moduleId);

    ops.removeModule(sectionId, moduleId);

    expect(state.draft.layoutSections.find((s) => s.id === sectionId)!.modules).toHaveLength(0);
    expect(state.expandedModuleIds).not.toContain(moduleId);
  });

  it("moves a module within a column", () => {
    const { state, ops, sectionId } = withModule();
    const section = state.draft.layoutSections.find((s) => s.id === sectionId)!;
    ops.addModuleFromPalette(sectionId, getLayoutColumns(section.layout)[0], { type: "quote", label: "Quote" } as never);
    const [first, second] = state.draft.layoutSections.find((s) => s.id === sectionId)!.modules.map((m) => m.id);

    ops.moveModule(sectionId, second, -1);

    const ids = state.draft.layoutSections.find((s) => s.id === sectionId)!.modules.map((m) => m.id);
    expect(ids).toEqual([second, first]);
  });
});

describe("useBuilderDraftOps panels and background", () => {
  it("toggles a builder panel", () => {
    const { state, ops } = createHarness();
    expect(state.panels.workspace).toBe(true);

    ops.toggleBuilderPanel("workspace");

    expect(state.panels.workspace).toBe(false);
  });

  it("updates the page background via updater", () => {
    const { state, ops } = createHarness();

    ops.updatePageBackground((bg) => ({ ...bg, color: "#123456" }));

    expect(state.draft.pageBackground.color).toBe("#123456");
  });

  it("renames the draft", () => {
    const { state, ops } = createHarness();

    ops.setDraftName("My Page");

    expect(state.draft.name).toBe("My Page");
  });
});
