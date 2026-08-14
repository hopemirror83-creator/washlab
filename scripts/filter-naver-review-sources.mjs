import { readFile, writeFile } from 'node:fs/promises';

const reviews = JSON.parse(await readFile('data/naver-review-sources.json', 'utf8'));
const carwashes = JSON.parse(await readFile('data/carwashes.incheon.json', 'utf8'));
const carwashMap = new Map(carwashes.map((carwash) => [carwash.sourceId, carwash]));

const before = countByCity(reviews, carwashMap);
for (const group of reviews) {
  const carwash = carwashMap.get(group.sourceId);
  if (!carwash || !Array.isArray(group.sources)) continue;
  group.sources = group.sources.filter((source) => looksRelevant(source, carwash));
}

await writeFile('data/naver-review-sources.json', `${JSON.stringify(reviews, null, 2)}\n`, 'utf8');
const after = countByCity(reviews, carwashMap);
console.log(JSON.stringify({ before, after }, null, 2));

function countByCity(groups, map) {
  const out = {};
  for (const group of groups) {
    const carwash = map.get(group.sourceId);
    if (!carwash) continue;
    const key = carwash.cityLabel || 'unknown';
    out[key] ||= { total: 0, reviews: 0 };
    out[key].total += 1;
    if ((group.sources?.length || 0) > 0) out[key].reviews += 1;
  }
  return out;
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
    '스팀세차', '디테일링', '광택', '코팅', '하부세차', '카워시', '워시', 'wash',
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
  return score >= 55;
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
  return /^(wash|carwash|워시|세차|세차장|셀프|셀프세차|손세차|자동세차|카워시|디테일링|스팀|광택|코팅|24시|24시간)$/i.test(String(value || ''));
}

function hasConfidentUniqueName(name) {
  const cleaned = normalize(removeBranchWords(cleanBusinessName(name)));
  if (cleaned.length < 6) return false;
  return !/^(워시|세차|셀프|손세차|자동세차|카워시|디테일링|스팀|광택|코팅|wash|carwash)/i.test(cleaned);
}

function hasProductReviewNoise(value) {
  return /바디워시|샴푸|화장품|향수|선물|세차버킷|그릿가드|세차용품|용품리뷰|제품리뷰|실사용방법/.test(String(value || ''));
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
    .replace(/세차장|셀프세차장|손세차|자동세차|노터치|노브러쉬|노브러시|추천|후기|가격|요금/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
