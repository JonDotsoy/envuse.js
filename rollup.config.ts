import { RollupOptions } from "rollup";
import tsc from "@rollup/plugin-typescript";

const options: RollupOptions = {
  input: "./envuse.mts",
  plugins: [tsc()],
  output: [
    {
      file: "cjs/envuse.cjs",
      sourcemap: true,
      format: "cjs",
    },
    {
      file: "cjs/envuse.cj",
      sourcemap: true,
      format: "cjs",
    },
  ],
  external: ["node:fs/promises", "node:fs", "node:process", "@envuse/wasm"],
};

export default options;
