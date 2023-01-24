/// <reference types="vitest" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/__demos__/**"],
    watchExclude: [...configDefaults.watchExclude, "**/__demos__/**"],
  },
});
