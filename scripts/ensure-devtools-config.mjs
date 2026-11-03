#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const configPath = join(process.cwd(), ".next", "cache", "next-devtools-config.json");
const config = { disableDevIndicator: true };

await mkdir(join(process.cwd(), ".next", "cache"), { recursive: true });
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
