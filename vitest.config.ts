/// <reference types="vitest" />
import { defineConfig } from "vite";

export default defineConfig({
  test: {
    watchExclude: ["**/__demos__/**"],
  },
});
