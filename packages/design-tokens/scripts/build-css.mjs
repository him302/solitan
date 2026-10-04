// Emits dist/tokens.css from the compiled token CSS generator.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as css from '../dist/css.js';

const generateTokensCss = css.generateTokensCss ?? css.default?.generateTokensCss;

const here = dirname(fileURLToPath(import.meta.url));
const distDir = join(here, '..', 'dist');
mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, 'tokens.css'), generateTokensCss(), 'utf8');
console.log('Wrote dist/tokens.css');
