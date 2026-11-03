import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // .claude/worktrees holds nested checkouts of this same repo; without this
    // their copies of every suite run alongside the real ones.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", ".claude/**"],
    passWithNoTests: false
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
