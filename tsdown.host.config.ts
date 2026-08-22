import { defineConfig } from 'tsdown'

/**
 * Host entry for installed packages. DSH supplies these packages at runtime;
 * only the plugin's local TypeScript is bundled so Node never has to strip
 * types from a file under node_modules.
 */
export default defineConfig({
  name: 'dsh-oks/host',
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'node24',
  fixedExtension: false,
  dts: false,
  clean: false,
  sourcemap: false,
  external: [/^@deepseek-ai\//],
  outputOptions: {
    entryFileNames: 'index.mjs',
  },
})
