import fs from "node:fs";
import path from "node:path";

/**
 * Heuristic schema-drift detection between the incremental migrations in
 * supabase/migrations/ and the canonical snapshot supabase/schema.sql.
 *
 * The parser is deliberately token-level (no SQL AST): it extracts table
 * and column declarations from CREATE TABLE / ALTER TABLE ... ADD COLUMN
 * statements and checks the snapshot declares the same objects. It cannot
 * prove full equivalence, but it catches the common failure mode - a
 * migration lands without schema.sql being updated.
 */

const TABLE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)/gi;
const ADD_COLUMN_RE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_]+)/gi;
const DROP_TABLE_RE = /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)/gi;
const DROP_COLUMN_RE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_]+)\s+drop\s+column\s+(?:if\s+exists\s+)?([a-z_]+)/gi;
const RENAME_COLUMN_RE =
  /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?(?:public\.)?([a-z_]+)\s+rename\s+column\s+([a-z_]+)\s+to\s+([a-z_]+)/gi;

function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

export type MigrationSchema = {
  /** table -> set of columns added via ALTER TABLE (post-creation) */
  addedColumns: Map<string, Set<string>>;
  /** tables created anywhere in the migration chain and still alive */
  tables: Set<string>;
};

export function readMigrationSchema(migrationsDir: string): MigrationSchema {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const tables = new Set<string>();
  const addedColumns = new Map<string, Set<string>>();

  const addColumn = (table: string, column: string) => {
    if (!addedColumns.has(table)) addedColumns.set(table, new Set());
    addedColumns.get(table)!.add(column);
  };

  for (const file of files) {
    const sql = stripSqlComments(fs.readFileSync(path.join(migrationsDir, file), "utf8"));

    for (const m of sql.matchAll(TABLE_RE)) tables.add(m[1].toLowerCase());
    for (const m of sql.matchAll(ADD_COLUMN_RE)) addColumn(m[1].toLowerCase(), m[2].toLowerCase());
    for (const m of sql.matchAll(DROP_TABLE_RE)) {
      tables.delete(m[1].toLowerCase());
      addedColumns.delete(m[1].toLowerCase());
    }
    for (const m of sql.matchAll(DROP_COLUMN_RE)) addedColumns.get(m[1].toLowerCase())?.delete(m[2].toLowerCase());
    for (const m of sql.matchAll(RENAME_COLUMN_RE)) {
      const cols = addedColumns.get(m[1].toLowerCase());
      if (cols?.has(m[2].toLowerCase())) {
        cols.delete(m[2].toLowerCase());
        cols.add(m[3].toLowerCase());
      }
    }
  }

  return { tables, addedColumns };
}

export type SnapshotSchema = {
  /** table -> full text of its CREATE TABLE block plus any ALTERs on it */
  tableText: Map<string, string>;
};

export function readSnapshotSchema(snapshotPaths: string[]): SnapshotSchema {
  const tableText = new Map<string, string>();

  for (const snapshotPath of snapshotPaths) {
    const sql = stripSqlComments(fs.readFileSync(snapshotPath, "utf8"));

    // CREATE TABLE blocks: capture from the statement to its closing ");"
    for (const m of sql.matchAll(TABLE_RE)) {
      const table = m[1].toLowerCase();
      const start = m.index ?? 0;
      const close = sql.indexOf(");", start);
      const block = sql.slice(start, close === -1 ? undefined : close + 2);
      tableText.set(table, (tableText.get(table) ?? "") + "\n" + block);
    }

    // ALTER TABLE ... ADD COLUMN in the snapshot also counts as declaring
    // the column (schema.sql occasionally patches tables this way).
    for (const m of sql.matchAll(ADD_COLUMN_RE)) {
      const table = m[1].toLowerCase();
      tableText.set(table, (tableText.get(table) ?? "") + `\n${m[2].toLowerCase()}`);
    }
  }

  return { tableText };
}

export type DriftReport = {
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
};

export function findSchemaDrift(migrations: MigrationSchema, snapshot: SnapshotSchema): DriftReport {
  const missingTables: string[] = [];
  const missingColumns: Array<{ table: string; column: string }> = [];

  for (const table of migrations.tables) {
    if (!snapshot.tableText.has(table)) {
      missingTables.push(table);
    }
  }

  for (const [table, columns] of migrations.addedColumns) {
    const text = snapshot.tableText.get(table);
    if (!text) continue; // reported as a missing table already
    for (const column of columns) {
      const columnRe = new RegExp(`\\b${column}\\b`, "i");
      if (!columnRe.test(text)) {
        missingColumns.push({ table, column });
      }
    }
  }

  return {
    missingTables: missingTables.sort(),
    missingColumns: missingColumns.sort((a, b) => `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`))
  };
}
