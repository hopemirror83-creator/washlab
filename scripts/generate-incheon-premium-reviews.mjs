import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadEnv, requireEnv } from './env.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const GENERATED_FILE = path.join(DATA_DIR, 'generated-carwash-pages.json');
const REVIEW_FILE = path.join(DATA_DIR, 'naver-review-sources.json');
const REPORT_DIR = path.join(DATA_DIR, 'vertex-test');
const DEFAULT_VERTEX_PROJECT_ID = 'newsite-507211';
const DEFAULT_VERTEX_LOCATION = 'global';
const DEFAULT_VERTEX_SERVICE_ACCOUNT_FILE = 'C:\\내문서\\애드버코더\\newsite-507211-b3cfb75b235a.json';
const cityLabel = process.env.PREMIUM_CITY_LABEL || '인천';
const districtFilter = process.env.PREMIUM_DISTRICT_FILTER || '';
const providerName = process.env.PREMIUM_PROVIDER_NAME || `gemini-${cityLabel}-premium`;
const safeReportName = `${cityLabel}${districtFilter ? `-${districtFilter}` : ''}`.replace(/[^\w가-힣-]+/g, '-');
const REPORT_FILE = path.join(REPORT_DIR, `${safeReportName}-premium-targets.json`);

await loadEnv();

const forceGeminiApi = process.env.PREMIUM_USE_GEMINI_API === '1';
if (forceGeminiApi) {
  delete process.env.VERTEX_SERVICE_ACCOUNT_FILE;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
} else {
  process.env.VERTEX_SERVICE_ACCOUNT_FILE = DEFAULT_VERTEX_SERVICE_ACCOUNT_FILE;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = DEFAULT_VERTEX_SERVICE_ACCOUNT_FILE;
  process.env.GOOGLE_CLOUD_PROJECT = DEFAULT_VERTEX_PROJECT_ID;
  process.env.VERTEX_LOCATION = DEFAULT_VERTEX_LOCATION;
}

const useVertex = !forceGeminiApi && Boolean(process.env.VERTEX_SERVICE_ACCOUNT_FILE);
if (!useVertex) requireEnv(['GEMINI_API_KEY']);

const { carwashes } = await import(`../src/data/siteData.ts?x=${Date.now()}`);
const reviewGroups = await readJsonIfExists(REVIEW_FILE, []);
const generatedPages = await readJsonIfExists(GENERATED_FILE, []);
const reviewMap = new Map(reviewGroups.map((group) => [group.sourceId, group]));
const generatedMap = new Map(generatedPages.map((page) => [page.sourceId, page]));
const getReviewCount = (item) => {
  const group = reviewMap.get(item.sourceId);
  return group ? (group.sources || []).length : Number(item.sourceRefs?.length || item.sourceCount || 0);
};

const threshold = Number(process.env.PREMIUM_REVIEW_THRESHOLD || 8);
const limit = Number(process.env.PREMIUM_REVIEW_LIMIT || 9999);
const force = process.env.FORCE_PREMIUM === '1';
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const vertexLocation = process.env.VERTEX_LOCATION || DEFAULT_VERTEX_LOCATION;
const vertexModelCandidates = (process.env.VERTEX_MODEL_CANDIDATES || 'gemini-3.1-flash,gemini-3-flash-preview,gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
let vertexAuth = null;
let selectedVertexModel = process.env.VERTEX_MODEL || '';
const generatedAt = new Date().toISOString();

const targets = carwashes
  .filter((item) => item.cityLabel === cityLabel)
  .filter((item) => !districtFilter || item.district === districtFilter)
  .filter((item) => getReviewCount(item) >= threshold)
  .sort(
    (a, b) =>
      getReviewCount(b) - getReviewCount(a) ||
      Number(b.rankScore || 0) - Number(a.rankScore || 0) ||
      String(a.name).localeCompare(String(b.name), 'ko'),
  )
  .slice(0, limit);

await mkdir(REPORT_DIR, { recursive: true });
await writeFile(
  REPORT_FILE,
  `${JSON.stringify(
    targets.map((item) => ({
      name: item.name,
      areaLabel: item.areaLabel,
      slug: item.slug,
      sourceCount: getReviewCount(item),
      url: `https://washlab.product-pack.com/carwash/${item.slug}/`,
    })),
    null,
    2,
  )}\n`,
  'utf8',
);

let completed = 0;
for (const [index, item] of targets.entries()) {
  const old = generatedMap.get(item.sourceId);
  if (old?.aiProvider === providerName && !force) {
    console.log(`Skip existing ${index + 1}/${targets.length}: ${item.name}`);
    continue;
  }

  const sources = buildSources(item);
  console.log(`Premium Gemini ${index + 1}/${targets.length}: ${item.name} (${sources.length})`);
  const draft = await generatePremiumContent(item, sources);
  const page = {
    sourceId: item.sourceId,
    slug: item.slug,
    hasReviews: sources.length > 0,
    sourceCount: sources.length,
    sourceLinks: sources.map((source) => source.link),
    sourceRefs: sources.map((source) => ({ title: source.title, link: source.link })),
    updatedAt: generatedAt,
    aiProvider: providerName,
    ...draft,
  };
  generatedMap.set(item.sourceId, page);
  completed += 1;

  if (completed % Number(process.env.PREMIUM_CHECKPOINT_EVERY || 5) === 0) {
    await saveGeneratedPages();
    console.log(`Checkpoint saved: ${completed}`);
  }
  await sleep(Number(process.env.PREMIUM_DELAY_MS || 900));
}

await saveGeneratedPages();
console.log(`Wrote ${path.relative(ROOT, GENERATED_FILE)}`);
console.log(`Premium generated: ${completed}`);
console.log(`Targets: ${targets.length}`);

function buildSources(item) {
  const group = reviewMap.get(item.sourceId);
  const fromGroup = (group?.sources || []).filter((source) => source?.link && !/\.pdf(?:$|[?#])/i.test(source.link));
  const fromItem = (item.sourceRefs || []).map((source) => ({ title: source.title, link: source.link }));
  // A collected review group is authoritative, including when it was intentionally cleaned to zero.
  const merged = reviewMap.has(item.sourceId) ? fromGroup : fromItem;
  const seen = new Set();
  return merged
    .filter((source) => {
      if (!source.link || seen.has(source.link)) return false;
      seen.add(source.link);
      return true;
    })
    .slice(0, 8)
    .map((source) => ({
      title: source.title || '네이버 블로그 후기',
      link: source.link,
      description: source.description || '',
      bloggerName: source.bloggerName || '',
      postdate: source.postdate || '',
      query: source.query || '',
    }));
}

async function generatePremiumContent(item, sources) {
  const prompt = buildPrompt(item, sources);
  if (useVertex) {
    const text = await generateWithVertex(prompt);
    const parsed = parseJsonObject(text);
    return polishContent(item, sources, parsed);
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.55,
        topP: 0.88,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini failed for ${item.name}: ${response.status} ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
  const parsed = parseJsonObject(text);
  return polishContent(item, sources, parsed);
}

async function generateWithVertex(prompt) {
  const auth = await getVertexAuth();
  const candidates = selectedVertexModel ? [selectedVertexModel] : vertexModelCandidates;
  let lastError = '';
  for (const candidate of candidates) {
    const host = vertexLocation === 'global' ? 'aiplatform.googleapis.com' : `${vertexLocation}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${auth.projectId}/locations/${vertexLocation}/publishers/google/models/${candidate}:generateContent`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.55,
          topP: 0.88,
          responseMimeType: 'application/json',
        },
      }),
    });
    const body = await response.text();
    if (response.ok) {
      selectedVertexModel = candidate;
      const data = JSON.parse(body);
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
      if (!text) throw new Error(`Vertex returned empty content with ${candidate}.`);
      return text;
    }
    lastError = `Vertex ${candidate} failed: ${response.status} ${body.slice(0, 400)}`;
    if (![400, 403, 404].includes(response.status)) break;
  }
  throw new Error(lastError || 'Vertex generation failed.');
}

async function fetchWithRetry(url, options, attempts = 6) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      const retryable = [429, 500, 502, 503, 504].includes(response.status);
      if (!retryable || attempt === attempts) return response;

      await response.body?.cancel();
      const retryAfter = Number(response.headers.get('retry-after'));
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(5000 * 2 ** (attempt - 1), 80000);
      console.log(`Vertex ${response.status}; retry ${attempt}/${attempts} after ${Math.ceil(backoff / 1000)}s`);
      await sleep(backoff);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      await sleep(Math.min(3000 * 2 ** (attempt - 1), 30000));
    }
  }
  throw lastError;
}

async function getVertexAuth() {
  if (vertexAuth && vertexAuth.expiresAt > Date.now() + 60_000) return vertexAuth;
  const serviceAccount = JSON.parse(await readFile(process.env.VERTEX_SERVICE_ACCOUNT_FILE, 'utf8'));
  const assertion = signServiceAccountJwt(serviceAccount);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Vertex auth failed: ${response.status} ${JSON.stringify(data).slice(0, 400)}`);
  vertexAuth = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
    projectId: serviceAccount.project_id,
  };
  return vertexAuth;
}

function signServiceAccountJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key);
  return `${unsigned}.${base64Url(signature)}`;
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function buildPrompt(item, sources) {
  const sourceText = sources
    .map(
      (source, index) =>
        `${index + 1}. 제목: ${source.title}\n설명: ${source.description || '설명 없음'}\n작성일: ${source.postdate || '미상'}\nURL: ${source.link}`,
    )
    .join('\n\n');

  return `당신은 워시랩의 세차장 상세페이지 편집자입니다.

목표:
- 방문자가 편하게 읽을 수 있는 정보형 상세페이지 문장을 작성합니다.
- 네이버 블로그 후기를 참고하되 직접 방문 후기처럼 쓰지 않습니다.
- "후기 후보", "신호", "데이터 기반", "AI", "검증된" 같은 딱딱한 표현은 쓰지 않습니다.
- 광고성 과장 표현은 줄이고, 실제 선택에 도움이 되는 말로 씁니다.
- 업체별로 문장이 반복되지 않도록 자연스럽게 씁니다.
- 없는 정보는 단정하지 않습니다.
- 방문 전 요금, 운영시간, 장비 상태는 업체나 네이버 지도에서 다시 확인하라는 문장을 자연스럽게 넣습니다.

반드시 JSON 객체만 반환하세요.
필드:
{
  "introSection": "업체 기본정보 2~3문장",
  "facilitySection": "시설/세차 방식 설명 4~6문장",
  "reviewSection": "네이버 블로그 후기를 모은 분석 700~1100자. 문단 나눔은 \\n\\n 사용",
  "fieldCheckSection": "방문 전 확인하면 좋은 점 4~6문장",
  "positivePoints": ["긍정 의견 4개"],
  "cautionPoints": ["확인할 점 4개"],
  "conclusionSection": "마무리 2문장"
}

업체 정보:
- 이름: ${item.name}
- 지역: ${item.areaLabel}
- 주소: ${item.roadAddress || item.lotAddress || '주소 정보 없음'}
- 전화: ${item.phone || '정보 없음'}
- 유형: ${item.washType || '세차'}
- 카테고리: ${item.category || '세차'}
- 운영시간: 평일 ${item.weekdayHours || '정보 없음'}, 휴일 ${item.holidayHours || '정보 없음'}
- 요금: ${item.feeInfo || '요금 정보 없음'}
- 확인된 서비스: ${(item.serviceLabels || []).join(', ') || '정보 없음'}

네이버 블로그 참고 글:
${sourceText}`;
}

function polishContent(item, sources, parsed) {
  const fallback = buildFallback(item, sources);
  const content = {
    introSection: cleanText(parsed.introSection) || fallback.introSection,
    facilitySection: cleanText(parsed.facilitySection) || fallback.facilitySection,
    reviewSection: cleanText(parsed.reviewSection) || fallback.reviewSection,
    fieldCheckSection: cleanText(parsed.fieldCheckSection) || fallback.fieldCheckSection,
    positivePoints: normalizeList(parsed.positivePoints, fallback.positivePoints).slice(0, 4),
    cautionPoints: normalizeList(parsed.cautionPoints, fallback.cautionPoints).slice(0, 4),
    conclusionSection: cleanText(parsed.conclusionSection) || fallback.conclusionSection,
  };

  if (!/네이버 블로그/.test(content.reviewSection)) {
    content.reviewSection = `네이버 블로그의 관련 글을 함께 살펴보면 다음과 같은 분위기가 보입니다.\n\n${content.reviewSection}`;
  }
  if (!/방문 전|확인/.test(content.reviewSection)) {
    content.reviewSection += '\n\n이 내용은 네이버 블로그의 후기를 모은 분석으로 실제 상황은 달라졌을 수 있으니, 방문 전에는 업체 안내나 네이버 지도 최신 정보를 한 번 더 확인해 보시는 것이 좋습니다.';
  }

  return content;
}

function buildFallback(item, sources) {
  const area = item.areaLabel || [item.cityLabel, item.district, item.dong].filter(Boolean).join(' ');
  const titles = sources.map((source) => source.title).join(' ');
  return {
    introSection: `${item.name}은 ${area}에서 확인되는 ${item.washType || '세차'} 업체입니다. 주소는 ${item.roadAddress || item.lotAddress || '정보 없음'}이며, 방문 전에는 네이버 지도에서 영업 상태를 함께 확인하는 편이 좋습니다.`,
    facilitySection: `${item.name}은 ${(item.serviceLabels || []).join(', ') || item.washType || '세차'} 항목으로 살펴볼 수 있습니다. 세차 베이, 진공청소기, 매트 세척기, 하부세차 가능 여부는 매장마다 다를 수 있으니 최근 사진과 현장 안내를 함께 확인해 주세요.`,
    reviewSection: `네이버 블로그에서 ${sources.length}건의 관련 글을 확인했습니다.\n\n글 제목을 보면 ${summarizeTitles(titles)} 같은 내용이 반복됩니다. 워시랩에서는 이를 직접 이용 후기처럼 단정하지 않고, 방문 전 참고할 만한 의견으로 정리합니다.\n\n이 내용은 네이버 블로그의 후기를 모은 분석으로 실제 상황은 달라졌을 수 있으니, 방문 전에는 업체 안내나 네이버 지도 최신 정보를 한 번 더 확인해 보시는 것이 좋습니다.`,
    fieldCheckSection: `${item.name} 방문 전에는 운영시간, 요금, 이용 가능한 장비를 먼저 확인해 주세요. 특히 셀프세차장이라면 세차 베이 대기, 드라잉 공간, 진공청소기 위치를 같이 보는 것이 좋습니다.`,
    positivePoints: ['네이버 블로그에서 관련 방문 글을 확인할 수 있습니다.', '사진이 포함된 글은 세차 공간과 장비 구성을 미리 살펴보기 좋습니다.', '지역 내 비교 후보로 살펴볼 만합니다.', '최근 글이 있다면 운영 분위기를 참고하기 좋습니다.'],
    cautionPoints: ['운영시간은 방문 전 다시 확인해 주세요.', '요금과 코스는 현장 안내와 다를 수 있습니다.', '장비 상태와 대기 시간은 시간대에 따라 달라질 수 있습니다.', '블로그 글은 작성 시점이 다를 수 있습니다.'],
    conclusionSection: `${area}에서 ${item.washType || '세차'} 업체를 찾고 있다면 ${item.name}의 위치와 후기 내용을 주변 업체와 함께 비교해 보세요.`,
  };
}

function summarizeTitles(text) {
  const points = [];
  if (/실내|겨울|따뜻|비|날씨/.test(text)) points.push('실내 이용이나 날씨 영향을 덜 받는 점');
  if (/넓|쾌적|공간|베이/.test(text)) points.push('세차 공간과 베이 구성');
  if (/24|야간|밤|새벽/.test(text)) points.push('늦은 시간 이용 편의성');
  if (/노터치|노브러쉬|자동/.test(text)) points.push('자동세차나 노터치 방식');
  if (/하부|폼|진공|매트|드라잉/.test(text)) points.push('세부 장비와 부대시설');
  if (/가격|요금|가성비|쿠폰/.test(text)) points.push('요금과 이용 팁');
  return points.length ? points.slice(0, 3).join(', ') : '위치, 세차 방식, 이용 분위기';
}

function parseJsonObject(text) {
  const cleaned = String(text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return {};
    try {
      return JSON.parse(match[0]);
    } catch {
      return {};
    }
  }
}

function normalizeList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const list = value.map(cleanText).filter(Boolean);
  return list.length ? list : fallback;
}

function cleanText(value) {
  return String(value || '')
    .replace(/\bAI\b/gi, '')
    .replace(/후기 후보/g, '네이버 블로그 후기')
    .replace(/검색 신호|신호/g, '검색 결과')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function saveGeneratedPages() {
  const existingSourceIds = new Set(generatedMap.keys());
  const untouched = generatedPages.filter((page) => !existingSourceIds.has(page.sourceId));
  const updated = [...generatedMap.values()];
  await mkdir(DATA_DIR, { recursive: true });
  const body = `${JSON.stringify([...untouched, ...updated], null, 2)}\n`;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await writeFile(GENERATED_FILE, body, 'utf8');
      return;
    } catch (error) {
      if (attempt === 6) throw error;
      await sleep(750 * attempt);
    }
  }
}

async function readJsonIfExists(file, fallback = []) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
