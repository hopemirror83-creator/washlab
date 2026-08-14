import { rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const target = path.resolve(root, 'dist-current');

if (!target.startsWith(root)) {
  throw new Error(`Refusing to clean outside project: ${target}`);
}

await rm(target, { recursive: true, force: true });
