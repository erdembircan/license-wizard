import eslint from "@eslint/js";
import pluginPrettier from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["docs/**", "dist/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  pluginPrettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.js", "*.config.ts"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
);
