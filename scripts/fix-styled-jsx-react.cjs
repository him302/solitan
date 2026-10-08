/**
 * In this pnpm monorepo, React 19 is hoisted to the workspace root
 * (from Expo SDK 57 apps), but admin-web (Next.js 14) needs React 18.
 * pnpm installs React 18 in admin-web/node_modules/react and in
 * next/node_modules/react. Next.js Pages Router static generation uses
 * next/node_modules/react-dom-server which sets the React dispatcher on
 * next/node_modules/react. The server bundle for _error pages is external
 * (react is not bundled) and resolves react at runtime from Node.js module
 * resolution, finding apps/admin-web/node_modules/react — a different module
 * cache entry → null dispatcher → useContext crash.
 *
 * styled-jsx is also external from webpack; its require('react') resolves to
 * styled-jsx/node_modules/react — yet another separate module cache entry.
 *
 * Fix: for each nested react that must share the dispatcher with
 * next/node_modules/react-dom-server, break the pnpm hard link and rewrite
 * the index.js as a redirect to next/node_modules/react. This ensures a
 * single shared module cache entry so the dispatcher is always visible.
 *
 * The unlink-before-write is critical on pnpm: pnpm uses hard links so
 * styled-jsx/.../react/index.js and next/node_modules/react/index.js may
 * share an inode. Writing without unlinking corrupts ALL linked files.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nextReactIndex = path.join(
  root, 'node_modules', 'next', 'node_modules', 'react', 'index.js'
);

if (!fs.existsSync(nextReactIndex)) {
  console.log('fix-react-instances: next/node_modules/react/index.js not found, skipping');
  process.exit(0);
}

const nextReactStat = fs.statSync(nextReactIndex);

function patchRedirect(targetIndex, redirectContent) {
  if (!fs.existsSync(targetIndex)) return;

  const current = fs.readFileSync(targetIndex, 'utf8');
  if (current === redirectContent) return; // already patched

  const targetStat = fs.statSync(targetIndex);
  const sameInode = targetStat.ino === nextReactStat.ino &&
                    targetStat.dev === nextReactStat.dev;

  if (sameInode) {
    // Break the hard link before writing so next/node_modules/react is untouched.
    fs.unlinkSync(targetIndex);
  }

  fs.writeFileSync(targetIndex, redirectContent);
  console.log('fix-react-instances: patched', path.relative(root, targetIndex), '→ next/node_modules/react');
}

// 1. styled-jsx/node_modules/react — used at runtime by styled-jsx (external from webpack)
patchRedirect(
  path.join(root, 'node_modules', 'styled-jsx', 'node_modules', 'react', 'index.js'),
  `module.exports = require('../../../next/node_modules/react');\n`
);

// 2. apps/admin-web/node_modules/react — used at runtime by the Pages Router
//    server bundle (_error.js) which resolves react externally via Node.js
patchRedirect(
  path.join(root, 'apps', 'admin-web', 'node_modules', 'react', 'index.js'),
  `module.exports = require('../../../../node_modules/next/node_modules/react');\n`
);
