import path from 'node:path';
import { RollupOptions, RollupCache } from 'rollup';
import { FunctionEntry } from './getEntryForFunction.js';

export const buildInputConfig = (
  input: string,
  rollupConfig: RollupOptions,
  cache: RollupCache,
): RollupOptions => ({
  ...rollupConfig,
  input,
  cache,
});

export const buildOutputConfig = (
  functionEntry: FunctionEntry,
  rollupConfig: RollupOptions,
  cache: RollupCache,
): RollupOptions => {
  const output: any = rollupConfig?.output ?? {
    format: 'cjs',
    sourcemap: true,
  };

  return {
    ...rollupConfig,
    output: {
      ...output,
      file: path.join(functionEntry.destination, `index.${output.format === 'esm' ? 'mjs' : 'js'}`),
    },
    cache,
  };
};
