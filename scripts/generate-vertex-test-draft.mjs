import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv, requireEnv } from './env.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'data', 'vertex-test');
const PROMPT_FILE = path.join(OUT_DIR, 'vertex-author-prompt.md');
const OUTPUT_FILE = path.join(OUT_DIR, 'vertex-author-draft.md');

await loadEnv();
requireEnv(['GEMINI_API_KEY']);

const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const prompt = await readFile(PROMPT_FILE, 'utf8');
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.75,
        topP: 0.9,
      },
    }),
  },
);

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Gemini draft generation failed: ${response.status} ${body.slice(0, 500)}`);
}

const data = await response.json();
const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
if (!text) throw new Error('Gemini draft generation returned empty content.');

await writeFile(OUTPUT_FILE, `${text}\n`, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
