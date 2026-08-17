/**
 * Minimal standalone reimplementation of dsh's clientBundle preset.
 *
 * Emits the loader's lazy-CJS factory artifact:
 *   window.__ModuleLoader__.load({ id, factory: (require) => { ...code... ; return module.exports; } });
 *
 * Platform modules (the frozen module-table seed) stay external; everything
 * else inlines. The purity gate forbids cross-plugin value imports —
 * collaborate through cordis services instead.
 *
 * Usage: DSH_BUILD_FACE=client npx tsdown
 */
import { defineConfig } from 'tsdown'

const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]
const RUNTIME_EXEMPTION = '@deepseek-ai/dsh-client-runtime/client'
const EXTERNALS = [...PLATFORM_MODULES, RUNTIME_EXEMPTION]

const ID = '@deepseek-ai/dsh-oks'

export default defineConfig({
  name: 'dsh-oks/client',
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: true,
  sourcemap: true,
  external: EXTERNALS,
  // Inline everything that isn't a platform module.
  noExternal: (id: string) => (EXTERNALS.includes(id) ? undefined : true),
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  plugins: [{
    name: 'dsh-oks-purity',
    resolveId(source: string) {
      if (!source.startsWith('@deepseek-ai/')) return null
      if (EXTERNALS.includes(source)) return null
      // Allow our own package's internal imports.
      if (source.startsWith(ID) || source.startsWith('.') || source.startsWith('/')) return null
      throw new Error(
        `client bundle purity: "${source}" is not a platform module or an inline-safe layer — `
        + 'cross-plugin value imports are forbidden; use cordis services (type-only imports are erased).',
      )
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
