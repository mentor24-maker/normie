import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**", "gemini-code-*.txt"]
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // New React Compiler rules from eslint-config-next 16 flag 63
    // pre-existing patterns. Demoted to warnings so the Next 16 upgrade
    // stays behavior-neutral; burn these down as their own cleanup task.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn"
    }
  }
];

export default eslintConfig;
