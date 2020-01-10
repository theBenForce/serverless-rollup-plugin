import { RollupOptions } from "rollup";

export interface CustomConfiguration {
  /**
   * Rollup configuration, or a string pointing to the configuration
   */
  config: string | RollupOptions;

  /**
   * Glob patterns to match files that should be excluded when bundling build results
   */
  excludeFiles?: Array<string>;

  /**
   * The command used to install function dependencies, ex: yarn add
   */
  installCommand?: string;

  /**
   * Optional list of dependencies to install to every lambda
   */
  dependencies?: string[];
}
