#!/usr/bin/env node
/**
 * Bundles every function (plus shared domain code, zod and node-appwrite) into a single ESM file:
 *   appwrite/functions/dist/<name>/main.js
 * Deploy with `appwrite push functions` (paths in appwrite/appwrite.json point at dist/).
 */
import fs from 'node:fs';
import path from 'node:path';

import { build } from 'esbuild';

const root = import.meta.dirname;
const dist = path.join(root, 'dist');
const names = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && d.name !== 'dist' && d.name !== 'node_modules')
  .filter((d) => fs.existsSync(path.join(root, d.name, 'main.ts')))
  .map((d) => d.name);

fs.rmSync(dist, { recursive: true, force: true });

for (const name of names) {
  const outdir = path.join(dist, name);
  await build({
    entryPoints: [path.join(root, name, 'main.ts')],
    outfile: path.join(outdir, 'main.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    minify: true,
    sourcemap: false,
    legalComments: 'none',
    // node-appwrite pulls in CJS deps that call require(); give ESM a require shim.
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    logLevel: 'warning',
  });
  fs.writeFileSync(
    path.join(outdir, 'package.json'),
    JSON.stringify({ name: `twelvetesters-fn-${name}`, private: true, type: 'module', main: 'main.js' }, null, 2),
  );
  console.log(`built ${name}`);
}
