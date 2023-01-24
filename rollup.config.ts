import { RollupOptions } from "rollup";
import tsc from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const options: RollupOptions[] = [
  {
    input: {
      envuse: "./src/envuse.mts",
      config: "./src/config.mts",
    },
    plugins: [dts()],
    external: (e) => e.endsWith("storeTypeReference.d.ts"),
    output: {
      dir: "dist",
      entryFileNames: "[name].d.ts",
      format: "es",
    },
  },
  {
    input: {
      envuse: "./src/envuse.mts",
      config: "./src/config.mts",
    },
    plugins: [tsc()],
    output: [
      {
        dir: "dist",
        entryFileNames: "[name].cjs",
        sourcemap: true,
        format: "cjs",
      },
      {
        dir: "dist",
        entryFileNames: "[name].js",
        sourcemap: true,
        format: "cjs",
      },
      {
        dir: "dist",
        entryFileNames: "[name].mjs",
        sourcemap: true,
        format: "esm",
      },
    ],
    external: ["node:fs/promises", "node:fs", "node:process", "@envuse/wasm"],
  },
];

export default options;
