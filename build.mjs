import esbuild from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { readFileSync, writeFileSync } from 'fs';

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  bundle: true,
  minify: isProduction,
  sourcemap: !isProduction,
  platform: 'node',
  external: ['electron', 'better-sqlite3'],
};

const mainConfig = {
  ...baseConfig,
  entryPoints: ['src/main/index.ts'],
  outfile: 'dist/main/index.js',
  format: 'cjs',
};

const preloadConfig = {
  ...baseConfig,
  entryPoints: ['src/preload/index.ts'],
  outfile: 'dist/preload/index.js',
  format: 'cjs',
};

const rendererConfig = {
  ...baseConfig,
  entryPoints: ['src/renderer/index.tsx'],
  outfile: 'dist/renderer/index.js',
  platform: 'browser',
  format: 'esm',
  plugins: [
    copy({
      resolveFrom: 'cwd',
      assets: {
        from: ['./src/renderer/index.html'],
        to: ['./dist/renderer'],
      },
    }),
  ],
};

const build = async () => {
  try {
    // Build JS/TS
    await Promise.all([
      esbuild.build(mainConfig),
      esbuild.build(preloadConfig),
      esbuild.build(rendererConfig),
    ]);

    console.log('Build successful!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
};

build();
