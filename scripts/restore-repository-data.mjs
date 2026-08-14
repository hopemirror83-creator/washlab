import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';

const gunzipAsync = promisify(gunzip);
const root = process.cwd();
const packedDir = path.join(root, 'data', 'packed');
const sourceFiles = [
  'generated-carwash-pages.json',
  'naver-review-sources.json',
  'naver-local-carwashes.json',
];

await mkdir(path.join(root, 'data'), { recursive: true });

for (const filename of sourceFiles) {
  const source = path.join(packedDir, `${filename}.gz`);
  const target = path.join(root, 'data', filename);
  const input = await readFile(source);
  const output = await gunzipAsync(input);
  await writeFile(target, output);
  console.log(`Restored data/${filename}`);
}
