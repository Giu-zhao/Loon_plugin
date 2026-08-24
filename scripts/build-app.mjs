import { build } from 'esbuild';

await build({
  entryPoints: ['src/api/index.ts'],
  bundle: true,
  minify: true,
  platform: 'browser',
  target: ['es2020'],
  inject: ['src/app/lib/text-polyfill.mjs'],
  banner: { js: '/* YouTube Ultimate API 2.0.0 */' },
  legalComments: 'none',
  sourcemap: false,
  outfile: 'YouTubeUltimateAPI.js',
});
