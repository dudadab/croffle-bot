import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = import.meta.dirname;
export const rootDir = join(here, '..', '..');
export const srcDir = join(rootDir, 'src');
