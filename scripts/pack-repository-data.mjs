import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';

const gzipAsync = promisify(gzip);
const root = process.cwd();
const packedDir = path.join(root, 'data', 'packed');
const sourceFiles = [
  'generated-carwash-pages.json',
  'naver-review-sources.json',
  'naver-local-carwashes.json',
];

await mkdir(packedDir, { recursive: true });

for (const filename of sourceFiles) {
  const source = path.join(root, 'data', filename);
  const target = path.join(packedDir, `${filename}.gz`);
  const input = await readFile(source);
  const output = await gzipAsync(input, { level: 9 });
  await writeFile(target, output);
  console.log(`Packed data/${filename} -> data/packed/${filename}.gz`);
}
