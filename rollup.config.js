import commonjs from "rollup-plugin-commonjs";
import typescript from "rollup-plugin-typescript2";
import resolve from "rollup-plugin-node-resolve";
import sourcemaps from "rollup-plugin-sourcemaps";
import builtins from "builtin-modules";
import cleanup from "rollup-plugin-cleanup";

import pkg from "./package.json";

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
      exports: "auto"
    }
  ],
  plugins: [
    typescript({
      useTsconfigDeclarationDir: true,
      typescript: require("typescript"),
      verbosity: 2
    }),
    resolve({ preferBuiltins: true }),
    commonjs(),
    cleanup({
      extensions: ["js", "ts"]
    }),
    sourcemaps()
  ],
  external: [
    "rollup",
    ...builtins,
    ...Object.keys(pkg.peerDependencies),
    ...Object.keys(pkg.dependencies)
  ]
};
