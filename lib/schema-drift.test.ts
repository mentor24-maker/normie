import { describe, expect, it } from "vitest";
import path from "node:path";
import { findSchemaDrift, readMigrationSchema, readSnapshotSchema } from "./schema-drift";

const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
// player-portal.sql is a standalone install script that owns the player
// tables; together with schema.sql it forms the canonical snapshot.
const SNAPSHOTS = [path.join(ROOT, "supabase", "schema.sql"), path.join(ROOT, "supabase", "player-portal.sql")];

describe("schema drift guard", () => {
  it("every table and column in the migration chain is declared in the schema snapshot", () => {
    const migrations = readMigrationSchema(MIGRATIONS_DIR);
    const snapshot = readSnapshotSchema(SNAPSHOTS);
    const drift = findSchemaDrift(migrations, snapshot);

    expect(
      drift.missingTables,
      `Tables created by migrations but missing from supabase/schema.sql - update the snapshot when adding a migration: ${drift.missingTables.join(", ")}`
    ).toEqual([]);
    expect(
      drift.missingColumns,
      `Columns added by migrations but missing from the schema snapshot: ${drift.missingColumns
        .map((c) => `${c.table}.${c.column}`)
        .join(", ")}`
    ).toEqual([]);
  });

  it("parses a sane number of objects (guard against silent parser breakage)", () => {
    const migrations = readMigrationSchema(MIGRATIONS_DIR);

    expect(migrations.tables.size).toBeGreaterThan(20);
  });
});
