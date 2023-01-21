import { RollupOptions } from "rollup";
import tsc from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const options: RollupOptions[] = [
  {
    input: "./src/envuse.mts",
    plugins: [dts()],
    output: {
      file: "dist/envuse.d.ts",
      format: "es",
    },
  },
  {
    input: "./src/envuse.mts",
    plugins: [tsc()],
    output: [
      {
        file: "dist/envuse.cjs",
        sourcemap: true,
        format: "cjs",
      },
      {
        file: "dist/envuse.js",
        sourcemap: true,
        format: "cjs",
      },
      {
        file: "dist/envuse.mjs",
        sourcemap: true,
        format: "esm",
      },
    ],
    external: ["node:fs/promises", "node:fs", "node:process", "@envuse/wasm"],
  },
];

export default options;
