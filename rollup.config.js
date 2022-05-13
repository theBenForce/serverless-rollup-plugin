import typescript from "@rollup/plugin-typescript";
import cleanup from "rollup-plugin-cleanup";

import { builtinModules as builtins } from 'module';

import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
      exports: "auto",
      sourcemap: true
    }
  ],
  plugins: [
    typescript(),
    cleanup({
      extensions: ["js", "ts"]
    })
  ],
  external: [
    "rollup",
    ...builtins,
    ...Object.keys(pkg.peerDependencies),
    ...Object.keys(pkg.dependencies)
  ]
};
