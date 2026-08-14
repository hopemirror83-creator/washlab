import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from './env.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const CARWASH_FILE = path.join(DATA_DIR, 'carwashes.incheon.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'naver-review-sources.json');

await loadEnv();

const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('NAVER_CLIENT_ID and NAVER_CLIENT_SECRET are required.');

const carwashes = JSON.parse(await readFile(CARWASH_FILE, 'utf8'));
const existing = await readJsonIfExists(OUTPUT_FILE, []);
const existingMap = new Map(existing.map((item) => [item.sourceId, item]));
const resultMap = new Map(existing.map((item) => [item.sourceId, item]));

const cityFilter = normalize(process.env.NAVER_CITY_FILTER || '');
const districtFilter = normalize(process.env.NAVER_DISTRICT_FILTER || '');
const nameFilter = normalize(process.env.NAVER_NAME_FILTER || '');
const sourceFilter = normalize(process.env.NAVER_SOURCE_FILTER || '');
const onlyEmpty = process.env.NAVER_ONLY_EMPTY === '1';
const force = process.env.FORCE_NAVER === '1';
const limit = Number(process.env.NAVER_LIMIT || carwashes.length);
const checkpointEvery = Number(process.env.NAVER_CHECKPOINT_EVERY || 25);
const collectedAt = new Date().toISOString();

let refreshed = 0;
let stoppedByQuota = false;

for (const [index, carwash] of carwashes.entries()) {
  const old = existingMap.get(carwash.sourceId);
  const oldSourceCount = old?.sources?.length || 0;
  const shouldProcess =
    (!cityFilter || normalize(carwash.cityLabel) === cityFilter) &&
    (!districtFilter || normalize(carwash.district) === districtFilter) &&
    (!sourceFilter || normalize(carwash.source) === sourceFilter) &&
    (!nameFilter || normalize(carwash.name).includes(nameFilter)) &&
    (!onlyEmpty || oldSourceCount === 0);

  if (!shouldProcess) continue;
  if (old && !force && !(onlyEmpty && oldSourceCount === 0)) continue;
  if (refreshed >= limit) break;

  console.log(`Naver blog broad search ${index + 1}/${carwashes.length}: ${carwash.cityLabel} ${carwash.name}`);
  try {
    const queries = buildQueries(carwash);
    const sources = await collectSources(carwash, queries);
    resultMap.set(carwash.sourceId, {
      sourceId: carwash.sourceId,
      slug: carwash.slug,
      name: carwash.name,
      address: carwash.roadAddress || carwash.lotAddress,
      cityLabel: carwash.cityLabel,
      queries,
      sources,
      collectedAt,
    });
    refreshed += 1;
  } catch (error) {
    console.warn(`Stopped at ${carwash.name}: ${error.message}`);
    if (/429|limit|quota/i.test(error.message)) stoppedByQuota = true;
    break;
  }

  if (refreshed % checkpointEvery === 0) {
    await saveResults();
    console.log(`Checkpoint saved after ${refreshed} refreshed groups.`);
  }
  await sleep(Number(process.env.NAVER_DELAY_MS || 120));
}

await saveResults();
console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`Refreshed groups: ${refreshed}`);
if (stoppedByQuota) process.exitCode = 2;

async function collectSources(carwash, queries) {
  const seen = new Set();
  const sources = [];
  for (const query of queries.slice(0, Number(process.env.NAVER_QUERY_MAX || 18))) {
    const items = await searchNaverBlog(query);
    await sleep(Number(process.env.NAVER_QUERY_DELAY_MS || 60));
    for (const item of items) {
      const source = normalizeItem(item, query);
      if (!source.link || seen.has(source.link)) continue;
      if (!looksRelevant(source, carwash)) continue;
      seen.add(source.link);
      sources.push(source);
      if (sources.length >= Number(process.env.NAVER_REVIEW_MAX || 8)) return sources;
    }
  }
  return sources;
}

function buildQueries(carwash) {
  const name = clean(carwash.name);
  const cleanName = cleanBusinessName(name);
  const tokens = buildReadableNameTokens(name);
  const city = carwash.cityLabel || '';
  const district = carwash.district || '';
  const dong = carwash.dong || '';
  const area = [city, district, dong].filter(Boolean).join(' ');
  const districtArea = [city, district].filter(Boolean).join(' ');
  const brand = tokens[0] || cleanName;
  const nameVariants = unique([
    name,
    cleanName,
    removeBranchWords(cleanName),
    tokens.slice(0, 2).join(' '),
    tokens.slice(0, 3).join(' '),
    brand,
  ].filter((value) => clean(value).length >= 2));
  const placeTokens = inferPlaceTokens(carwash);
  const roadTokens = inferRoadTokens(carwash);
  const searchSignals = (carwash.querySignals || []).slice(0, 5);

  return unique([
    ...nameVariants,
    ...nameVariants.flatMap((variant) => [
      `${variant} 후기`,
      `${variant} 블로그`,
      `${variant} 세차 후기`,
      `${variant} 세차장 후기`,
      `${variant} 내돈내산`,
      `${variant} 가격`,
      `${variant} 요금`,
    ]),
    `${area} ${name}`,
    `${area} ${name} 후기`,
    `${districtArea} ${name} 후기`,
    `${dong} ${name} 후기`,
    `${area} 세차장 후기`,
    `${districtArea} 세차장 후기`,
    `${dong} 세차장 후기`,
    `${brand} ${dong} 후기`,
    `${brand} ${dong} 세차장`,
    ...placeTokens.flatMap((place) => [
      `${brand} ${place}`,
      `${brand} ${place} 후기`,
      `${brand} ${place} 세차장`,
      `${city} ${place} 세차장 후기`,
    ]),
    ...roadTokens.flatMap((road) => [
      `${brand} ${road}`,
      `${brand} ${road} 후기`,
      `${road} 세차장 후기`,
    ]),
    ...searchSignals.flatMap((signal) => [
      `${signal} 후기`,
      `${signal} 블로그`,
      `${signal} 추천`,
    ]),
  ]);
}

async function searchNaverBlog(query) {
  const url = new URL('https://openapi.naver.com/v1/search/blog.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', process.env.NAVER_DISPLAY || '20');
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'sim');

  let response;
  for (let attempt = 1; attempt <= Number(process.env.NAVER_RETRY_COUNT || 3); attempt += 1) {
    response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': CLIENT_ID,
        'X-Naver-Client-Secret': CLIENT_SECRET,
      },
    });
    if (response.status !== 429) break;
    const waitMs = Number(process.env.NAVER_RATE_WAIT_MS || 3000) * attempt;
    console.warn(`Naver rate limit for "${query}". Retry ${attempt} after ${waitMs}ms`);
    await sleep(waitMs);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Naver blog API failed: ${response.status} ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  return data.items || [];
}

function normalizeItem(item, query) {
  return {
    title: stripHtml(item.title),
    link: item.link,
    description: stripHtml(item.description),
    bloggerName: stripHtml(item.bloggername),
    bloggerLink: item.bloggerlink,
    postdate: item.postdate,
    query,
  };
}

function looksRelevant(source, carwash) {
  const haystack = normalize(`${source.title || ''} ${source.description || ''}`);
  const nameKeys = buildNameKeys(carwash.name).filter((key) => key.length >= 2 && !isWeakNameKey(key));
  const tokens = buildReadableNameTokens(carwash.name).map(normalize).filter((token) => token.length >= 2 && !isWeakNameKey(token));
  const brand = tokens[0];
  const places = buildPlaceKeys(carwash).map(normalize).filter((key) => key.length >= 2);
  const signalKeys = (carwash.querySignals || []).map(normalize).filter((key) => key.length >= 2);
  const carwashWords = [
    '세차', '세차장', '셀프세차', '손세차', '자동세차', '노터치', '노브러쉬', '노브러시',
    '스팀세차', '디테일링', '광택', '코팅', '유리막', '하부세차', '카워시', '워시', 'wash',
  ].map(normalize);

  const hasCarwashWord = carwashWords.some((word) => haystack.includes(word));
  const hasPlace = places.some((place) => haystack.includes(place));
  const hasSignal = signalKeys.some((key) => haystack.includes(key));
  const hasBrand = Boolean(brand && brand.length >= 3 && haystack.includes(brand));
  const tokenHits = tokens.filter((token) => token.length >= 3 && haystack.includes(token)).length;
  const fullNameKey = normalize(removeBranchWords(cleanBusinessName(carwash.name)));
  const strongName = nameKeys.some((key) => key.length >= 4 && haystack.includes(key));
  const hasFullName = fullNameKey.length >= 4 && haystack.includes(fullNameKey);
  const hasSpecificNameClue = strongName || hasBrand || tokenHits >= 2;
  const score = scoreReviewMatch({ haystack, nameKeys, tokens, brand, places, hasCarwashWord, strongName, hasSignal });

  if (hasConflictingRegion(haystack, carwash) && !hasPlace && !strongName) return false;
  if (hasProductReviewNoise(haystack) && !hasPlace) return false;
  if (/^[a-z0-9]+$/i.test(fullNameKey) && fullNameKey.length < 6 && !hasPlace) return false;
  if (isGenericCarwashBrand(brand) && !hasPlace && !strongName && !hasSignal) return false;
  if (!hasCarwashWord && !strongName) return false;
  if (!strongName && !hasSpecificNameClue) return false;
  if (!strongName && !hasPlace && tokenHits < 2) return false;
  if (!hasPlace && !hasFullName && !hasConfidentUniqueName(carwash.name)) return false;
  return score >= Number(process.env.NAVER_RELEVANCE_SCORE || 58);
}

function scoreReviewMatch({ haystack, nameKeys, tokens, brand, places, hasCarwashWord, strongName, hasSignal }) {
  let score = 0;
  if (strongName) score += 55;
  for (const key of nameKeys) {
    if (key.length >= 6 && haystack.includes(key)) score += 18;
  }
  for (const token of tokens) {
    if (haystack.includes(token)) score += token.length >= 4 ? 14 : 8;
  }
  if (brand && haystack.includes(brand)) score += 22;
  if (places.some((place) => haystack.includes(place))) score += 32;
  if (hasSignal) score += 18;
  if (hasCarwashWord) score += 12;
  return score;
}

function buildPlaceKeys(carwash) {
  return unique([
    carwash.cityLabel,
    carwash.district,
    carwash.dong,
    ...inferPlaceTokens(carwash),
    ...inferRoadTokens(carwash),
  ]);
}

function isGenericCarwashBrand(brand) {
  return /워시|wash|컴인|킹콩|오토|스팀|셀프|카워시|카케어|세차/i.test(String(brand || ''));
}

function hasConflictingRegion(haystack, carwash) {
  const cityLabels = ['서울', '인천', '경기', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  return cityLabels.some((city) => city !== carwash.cityLabel && haystack.includes(normalize(city)));
}

function buildNameKeys(name) {
  const cleaned = cleanBusinessName(name);
  const tokens = buildReadableNameTokens(name);
  const compact = tokens.length >= 2 ? `${tokens[0]}${tokens[1]}` : '';
  return unique([name, cleaned, removeBranchWords(cleaned), compact, ...tokens].map(normalize).filter(Boolean));
}

function isWeakNameKey(value) {
  return /^(wash|carwash|워시|세차|세차장|셀프|셀프세차|손세차|자동세차|카워시|디테일링|스팀|광택|코팅|24시|24시간|오토|auto|the|더)$/i.test(String(value || ''));
}

function hasConfidentUniqueName(name) {
  const cleaned = normalize(removeBranchWords(cleanBusinessName(name)));
  if (cleaned.length < 6) return false;
  return !/^(워시|세차|셀프|손세차|자동세차|카워시|디테일링|스팀|광택|코팅|wash|carwash|auto|오토)/i.test(cleaned);
}

function hasProductReviewNoise(value) {
  return /바디워시|샴푸|화장품|향수|선물|선크림|선스크린|로션|클렌징|폼클렌저|세안|빨래방|세탁|세차버킷|그릿가드|세차용품|용품리뷰|제품리뷰|실사용방법|워시백|wash bag|자켓|재킷|의류|옷|가방|멀티워쉬|멀티워시/i.test(String(value || ''));
}

function buildReadableNameTokens(name) {
  return cleanBusinessName(name).split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function cleanBusinessName(name) {
  return clean(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/주식회사|유한회사|\(주\)|㈜|직영점|지점|점|본점|세차장|셀프세차장|손세차장|자동세차장|노터치세차|24시|24시간/g, ' ')
    .replace(/[&·|/,_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeBranchWords(value) {
  return clean(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/본점|직영점|지점|점|센터|세차장|셀프세차장|손세차장|자동세차장|디테일링샵|디테일링|노터치세차|노브러쉬세차|노브러시세차|24시|24시간|실내/g, ' ')
    .replace(/[&·|/,_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferPlaceTokens(carwash) {
  const addressTokens = String(carwash.roadAddress || carwash.lotAddress || '').match(/[가-힣0-9]+(?:동|읍|면|리|역|IC|ic|로|길)/g) || [];
  return unique([
    carwash.district,
    carwash.dong,
    ...(carwash.querySignals || []).map(extractSearchLocation),
    ...addressTokens,
  ].filter(Boolean));
}

function inferRoadTokens(carwash) {
  const road = String(carwash.roadAddress || '');
  const matches = road.match(/[가-힣0-9]+(?:로|길)\s*\d+(?:-\d+)?/g) || [];
  return matches.map((token) => token.replace(/\s+/g, ' ').trim());
}

function extractSearchLocation(signal) {
  return clean(signal)
    .replace(/세차장|셀프세차장|손세차|자동세차|노터치|노브러쉬|노브러시|추천|후기|가격|요금|하부세차|실내세차/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHtml(value) {
  return clean(value).replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return clean(value).replace(/\s+/g, '').toLowerCase();
}

function clean(value) {
  return String(value || '');
}

function unique(values) {
  return [...new Set(values.map((value) => clean(value).trim()).filter(Boolean))];
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveResults() {
  await mkdir(DATA_DIR, { recursive: true });
  const rows = [...resultMap.values()].sort((a, b) => String(a.sourceId).localeCompare(String(b.sourceId)));
  await writeFile(OUTPUT_FILE, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
