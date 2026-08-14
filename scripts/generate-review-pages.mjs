import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from './env.mjs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const CARWASH_FILE = path.join(DATA_DIR, 'carwashes.incheon.json');
const SOURCE_FILE = path.join(DATA_DIR, 'naver-review-sources.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'generated-carwash-pages.json');

await loadEnv();

const carwashes = JSON.parse(await readFile(CARWASH_FILE, 'utf8'));
const sources = await readJsonIfExists(SOURCE_FILE, []);
const existing = await readJsonIfExists(OUTPUT_FILE, []);
const sourceMap = new Map(sources.map((item) => [item.sourceId, item]));
const existingMap = new Map(existing.map((item) => [item.sourceId, item]));
const force = process.env.FORCE_REGENERATE === '1';
const cityFilter = normalize(process.env.GENERATE_CITY_FILTER || '');
const sourceFilter = normalize(process.env.GENERATE_SOURCE_FILTER || '');
const nameFilter = normalize(process.env.GENERATE_NAME_FILTER || '');
const generatedAt = new Date().toISOString();
const pages = [];
let generatedCount = 0;

for (const [index, carwash] of carwashes.entries()) {
  const old = existingMap.get(carwash.sourceId);
  const shouldProcess =
    (!cityFilter || normalize(carwash.cityLabel) === cityFilter) &&
    (!sourceFilter || normalize(carwash.source) === sourceFilter) &&
    (!nameFilter || normalize(carwash.name).includes(nameFilter));

  if (!shouldProcess) {
    if (old) pages.push(old);
    continue;
  }

  if (old && !force) {
    pages.push(old);
    continue;
  }

  const group = sourceMap.get(carwash.sourceId) || { sources: [] };
  const reviewSources = filterUsableSources(carwash, group.sources || []);
  console.log(`Generate page ${index + 1}/${carwashes.length}: ${carwash.name}`);
  pages.push({
    sourceId: carwash.sourceId,
    slug: carwash.slug,
    hasReviews: reviewSources.length > 0,
    sourceCount: reviewSources.length,
    sourceLinks: reviewSources.map((source) => source.link),
    sourceRefs: reviewSources.map((source) => ({ title: source.title, link: source.link })),
    updatedAt: generatedAt,
    aiProvider: 'fallback',
    ...fallbackContent(carwash, reviewSources),
  });
  generatedCount += 1;
}

for (const old of existing) {
  if (!pages.some((item) => item.sourceId === old.sourceId)) pages.push(old);
}

await mkdir(DATA_DIR, { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`Generated pages: ${generatedCount}`);

function fallbackContent(carwash, sources) {
  const area = carwash.areaLabel || [carwash.cityLabel, carwash.district, carwash.dong].filter(Boolean).join(' ');
  const address = carwash.roadAddress || carwash.lotAddress || '정보 없음';
  const detail = buildDetailCopy(carwash);
  const insights = buildReviewInsights(sources);
  const hasSources = sources.length > 0;
  const reviewIntro = hasSources
    ? `네이버 블로그에서 ${sources.length}건의 관련 글을 확인했습니다.`
    : '네이버 검색 후기는 아직 많지 않습니다.';
  const insightSentence = insights.length
    ? ` ${insights.slice(0, 3).join(' ')}`
    : hasSources
      ? ' 글마다 작성 시점이 다르지만, 위치와 세차 방식 정도는 참고할 수 있습니다.'
      : ' 방문 전에는 네이버 지도에 등록된 최근 사진과 영업 상태를 먼저 보는 편이 좋습니다.';

  return {
    introSection: `${carwash.name}은 ${area}에서 찾을 수 있는 세차장입니다. 주소는 ${address}이며, 네이버 지도에 등록된 위치와 최근 사진을 기준으로 정리했습니다.`,
    facilitySection: `${detail.categorySentence} ${detail.typeSentence} ${detail.facilitySentence} ${detail.paymentSentence}`,
    reviewSection: `${reviewIntro}${insightSentence} 워시랩에서는 블로그 내용을 직접 이용 후기처럼 단정하지 않고, 참고할 만한 의견으로만 정리합니다.`,
    fieldCheckSection: `${carwash.name}의 지도상 주소는 ${address}입니다. ${detail.phoneSentence} ${detail.hoursSentence} ${detail.priceSentence} ${detail.visitSentence}`,
    positivePoints: hasSources
      ? [
          ...insights.slice(0, 3),
          '네이버 블로그에서 관련 방문 글을 확인할 수 있습니다.',
          '사진이 포함된 글이 있으면 세차 공간과 장비 구성을 미리 살펴보기 좋습니다.',
        ].filter(Boolean)
      : ['주소와 지도 정보를 먼저 확인할 수 있습니다.', '방문 전 네이버 지도 사진을 참고하면 좋습니다.'],
    cautionPoints: [detail.hoursPoint, detail.pricePoint, detail.facilityPoint],
    conclusionSection: `${area}에서 ${carwash.washType || '세차'}를 찾고 있다면 ${carwash.name}의 위치, 세차 방식, 후기 여부를 주변 업체와 함께 비교해 볼 만합니다.`,
  };
}

function buildDetailCopy(carwash) {
  const category = carwash.category || '세차';
  const washType = carwash.washType || '세차';
  const labels = Array.isArray(carwash.serviceLabels) ? carwash.serviceLabels : [];
  const flags = carwash.flags || {};
  const querySignals = Array.isArray(carwash.querySignals) ? carwash.querySignals : [];
  const sourceCount = Number(carwash.sourceCount || 0);
  const serviceText = labels.length ? labels.slice(0, 4).join(', ') : washType;
  const hasPhone = carwash.phone && !/정보 없음/.test(String(carwash.phone));
  const hasWeekdayHours = carwash.weekdayHours && !/정보 없음/.test(String(carwash.weekdayHours));
  const hasHolidayHours = carwash.holidayHours && !/정보 없음/.test(String(carwash.holidayHours));
  const hasPrice = carwash.feeInfo && !/요금 정보 없음/.test(String(carwash.feeInfo));
  const combinedText = `${carwash.name} ${category} ${washType} ${labels.join(' ')} ${querySignals.join(' ')}`;

  const typeHints = [];
  if (flags.selfWash || /셀프|self/i.test(combinedText)) typeHints.push('셀프세차');
  if (flags.automaticWash || /자동세차|노터치|노브러시/.test(combinedText)) typeHints.push('자동세차');
  if (flags.handWash || /손세차|광택|디테일|실내크리닝/.test(combinedText)) typeHints.push('손세차');
  if (flags.gasStation || /주유소|충전소/.test(combinedText)) typeHints.push('주유소 부속 세차');

  return {
    categorySentence: `네이버 지도와 검색 기준 카테고리는 ${category}입니다.`,
    typeSentence: typeHints.length
      ? `업체명과 카테고리, 검색 결과를 보면 ${[...new Set(typeHints)].join(', ')} 쪽으로 살펴볼 만합니다.`
      : `워시랩에서는 ${washType} 업체로 정리했습니다.`,
    facilitySentence: buildFacilitySentence(combinedText, serviceText),
    paymentSentence: hasPrice
      ? `요금은 ${carwash.feeInfo}로 정리되어 있습니다. 코스별 금액과 이벤트 가격은 현장 안내와 다를 수 있습니다.`
      : '요금표가 공개되어 있지 않은 곳은 네이버 지도 사진, 업체 소식, 전화 문의로 기본요금과 추가요금을 확인하는 편이 좋습니다.',
    phoneSentence: hasPhone
      ? `전화번호는 ${carwash.phone}로 등록되어 있습니다.`
      : '전화번호가 따로 보이지 않으면 네이버 지도 상세 화면에서 문의 방법을 먼저 확인해 주세요.',
    hoursSentence:
      hasWeekdayHours || hasHolidayHours
        ? `운영시간은 평일 ${carwash.weekdayHours}, 휴일 ${carwash.holidayHours} 기준으로 정리했습니다.`
        : buildHoursSentence(combinedText),
    priceSentence: hasPrice ? `요금은 ${carwash.feeInfo}로 표시됩니다.` : '요금은 현장 안내판이나 최신 지도 사진에서 확인하는 것이 가장 정확합니다.',
    visitSentence: buildVisitSentence(combinedText),
    hoursPoint:
      hasWeekdayHours || hasHolidayHours
        ? `운영시간: 평일 ${carwash.weekdayHours}, 휴일 ${carwash.holidayHours} 기준입니다.`
        : /24시간|24시|연중무휴/.test(combinedText)
          ? '운영시간: 24시간 운영으로 보이는 단서가 있어도 장비 점검 시간은 별도로 확인해 주세요.'
          : '운영시간: 네이버 지도 영업 상태와 업체 안내를 기준으로 한 번 더 확인해 주세요.',
    pricePoint: hasPrice
      ? `요금: ${carwash.feeInfo}로 정리되어 있으며, 코스별 금액은 현장 안내를 함께 보는 것이 좋습니다.`
      : buildPricePoint(combinedText),
    facilityPoint: buildFacilityPoint(combinedText, serviceText, sourceCount),
  };
}

function buildVisitSentence(text) {
  if (/노터치|노브러시|노브러쉬|자동세차/.test(text)) return '자동세차를 이용할 계획이라면 코스표, 하부세차 포함 여부, 건조 구간을 사진에서 미리 확인해 보세요.';
  if (/셀프|self/i.test(text)) return '셀프세차를 이용할 계획이라면 세차 베이와 진공청소기 구역, 매트 세척 공간이 분리되어 있는지 살펴보면 좋습니다.';
  if (/손세차|광택|디테일|실내크리닝|실내세차|내부세차/.test(text)) return '손세차나 실내세차는 작업 범위와 예약 여부에 따라 이용 방식이 달라질 수 있습니다.';
  if (/주유소|충전소/.test(text)) return '주유소 부속 세차장은 주유 할인, 세차권 조건, 기계 운영 시간이 따로 있는지 확인하면 좋습니다.';
  return '사진에 안내판이 보이면 진공청소기, 매트세척기, 카드결제, 하부세차 같은 세부 시설을 함께 확인할 수 있습니다.';
}

function buildFacilitySentence(text, serviceText) {
  if (/노터치|노브러시|노브러쉬/.test(text)) return `노터치나 노브러쉬 방식이 궁금하다면 예비세척, 본세척, 건조 구간이 어떻게 나뉘는지 보는 것이 좋습니다. 현재 확인된 항목은 ${serviceText}입니다.`;
  if (/셀프|self/i.test(text)) return `셀프세차장은 세차 베이 수, 고압수와 폼건 상태, 진공청소기 공간이 이용 만족도에 큰 영향을 줍니다. 현재 확인된 항목은 ${serviceText}입니다.`;
  if (/손세차|광택|디테일|실내크리닝|실내세차|내부세차/.test(text)) return `손세차나 디테일링 업체는 외부세차만 하는지, 실내크리닝까지 가능한지에 따라 이용 시간이 달라집니다. 현재 확인된 항목은 ${serviceText}입니다.`;
  if (/주유소|충전소|자동세차/.test(text)) return `주유소 또는 자동세차 성격의 업체는 세차권 조건, 기계 운영 시간, 하부세차 옵션을 함께 보는 편이 좋습니다. 현재 확인된 항목은 ${serviceText}입니다.`;
  return `현재 확인된 항목은 ${serviceText}입니다. 진공청소기, 매트세척기, 하부세차, 카드결제 가능 여부는 최신 지도 사진에서 함께 살펴보세요.`;
}

function buildHoursSentence(text) {
  if (/24시간|24시|연중무휴/.test(text)) return '네이버 검색에서는 24시간 또는 연중무휴로 보이는 단서가 있습니다. 다만 장비 점검이나 청소 시간은 별도로 운영될 수 있습니다.';
  return '운영시간은 네이버 지도 영업 상태와 업체 안내를 기준으로 확인하는 것이 좋습니다.';
}

function buildPricePoint(text) {
  if (/쿠폰|이벤트|할인/.test(text)) return '요금: 쿠폰이나 이벤트 가격이 보일 수 있으니 방문 당일 적용 여부를 확인해 주세요.';
  if (/주유소|충전소/.test(text)) return '요금: 주유 금액에 따른 세차 할인이나 세차권 조건이 있을 수 있습니다.';
  if (/자동세차|노터치|노브러시/.test(text)) return '요금: 기본 코스, 하부세차 포함 코스, 건조 옵션에 따라 금액이 달라질 수 있습니다.';
  return '요금: 기본요금, 시간 추가, 카드결제 가능 여부는 네이버 지도 사진이나 업체 안내에서 확인해 주세요.';
}

function buildFacilityPoint(text, serviceText, sourceCount) {
  const reviewNote = sourceCount > 0 ? ` 블로그 글 ${sourceCount}건을 함께 참고했습니다.` : '';
  if (/하부/.test(text)) return `시설: 하부세차 가능 여부가 보이는 곳입니다. 실제 적용 코스와 가격은 현장 안내를 확인해 주세요.${reviewNote}`;
  if (/진공|청소기|매트/.test(text)) return `시설: 진공청소기나 매트세척기 관련 단서가 있습니다. 무료 여부와 위치는 현장 사진을 함께 보는 것이 좋습니다.${reviewNote}`;
  if (/노터치|노브러시/.test(text)) return `시설: 노터치 세차 방식에 관심 있다면 코스, 건조 구간, 하부세차 포함 여부를 확인해 주세요.${reviewNote}`;
  if (/셀프|self/i.test(text)) return `시설: ${serviceText} 외에 세차 베이 대기, 세차용품 자판기, 진공청소기 위치를 함께 확인하면 좋습니다.${reviewNote}`;
  return `시설: ${serviceText} 외에 진공청소기, 매트세척기, 하부세차, 카드결제 가능 여부를 최신 지도 사진에서 확인해 주세요.${reviewNote}`;
}

function buildReviewInsights(sources) {
  const text = normalize(sources.map((source) => `${source.title} ${source.description}`).join(' '));
  const rules = [
    [/빠르|신속|금방|빨리/, '일부 글에서는 세차가 빠르게 진행됐다는 의견이 보입니다.'],
    [/깔끔|깨끗|광택|반짝|만족/, '세차 결과가 깔끔했다는 의견을 남긴 이용자가 있습니다.'],
    [/넓|쾌적|공간|베이/, '세차 공간이 여유롭거나 쾌적하다는 의견이 보입니다.'],
    [/24시간|24시|연중무휴|야간|밤/, '늦은 시간 이용 편의성을 언급한 글이 있습니다.'],
    [/노터치|노브러시|자동세차/, '노터치 또는 자동세차 방식에 대해 언급한 글이 있습니다.'],
    [/셀프|고압|폼건|버블/, '셀프세차 장비와 세차 과정에 대한 언급이 있습니다.'],
    [/하부/, '하부세차 가능 여부를 살펴볼 만하다는 내용이 보입니다.'],
    [/진공|청소기|매트/, '진공청소기나 매트 세척 같은 부대시설을 언급한 글이 있습니다.'],
    [/가격|요금|가성비|쿠폰/, '요금이나 가성비를 함께 확인한 글이 있습니다.'],
    [/대기|줄|기다/, '시간대에 따라 대기 여부를 확인하면 좋겠다는 내용이 보입니다.'],
    [/친절|서비스/, '응대가 괜찮았다는 의견이 일부 확인됩니다.'],
  ];
  const picked = [];
  for (const [pattern, sentence] of rules) {
    if (pattern.test(text) && !picked.includes(sentence)) picked.push(sentence);
  }
  return picked;
}

function filterUsableSources(carwash, sources) {
  const seen = new Set();
  return sources
    .filter((source) => source?.link && source?.title)
    .filter((source) => {
      if (seen.has(source.link)) return false;
      seen.add(source.link);
      return looksUsableReviewSource(carwash, source);
    })
    .slice(0, Number(process.env.REVIEW_SOURCE_MAX || 8));
}

function looksUsableReviewSource(carwash, source) {
  const haystack = normalize(`${source.title} ${source.description}`);
  const nameKeys = buildNameKeys(carwash.name).filter((key) => key.length >= 2);
  const tokens = cleanBusinessName(carwash.name).split(/\s+/).map(normalize).filter((token) => token.length >= 2);
  const brand = tokens[0];
  const places = buildPlaceKeys(carwash).map(normalize).filter(Boolean);
  const carwashWords = ['세차', '세차장', '셀프세차', '손세차', '자동세차', '노터치', '노브러시', '노브러쉬', '카워시', '워시', '하부세차', '실내세차'].map(normalize);
  const hasCarwashWord = carwashWords.some((word) => haystack.includes(word));
  const hasPlace = places.some((place) => haystack.includes(place));
  const strongName = nameKeys.some((key) => key.length >= 4 && haystack.includes(key));
  const score = scoreReviewMatch({ haystack, nameKeys, tokens, brand, places, hasCarwashWord, strongName });

  if (hasConflictingRegion(haystack, carwash) && !hasPlace && !strongName) return false;
  if (isGenericCarwashBrand(brand) && !hasPlace && !strongName) return false;
  if (!hasCarwashWord && !strongName) return false;
  return score >= 65;
}

function scoreReviewMatch({ haystack, nameKeys, tokens, brand, places, hasCarwashWord, strongName }) {
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
  if (hasCarwashWord) score += 12;
  return score;
}

function buildPlaceKeys(carwash) {
  return [
    carwash.cityLabel,
    carwash.district,
    carwash.dong,
    ...inferPlaceTokens(carwash),
    ...inferRoadTokens(carwash),
  ].filter(Boolean);
}

function isGenericCarwashBrand(brand) {
  return /워시|wash|컴인|킹콩|오토|디케이|셀세모|플래닛|멜로우|존|카워시/.test(String(brand || ''));
}

function hasConflictingRegion(haystack, carwash) {
  const cityLabels = ['서울', '인천', '경기', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  return cityLabels.some((city) => city !== carwash.cityLabel && haystack.includes(normalize(city)));
}

function buildNameKeys(name) {
  const cleaned = cleanBusinessName(name);
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const compact = parts.length >= 2 ? `${parts[0]}${parts[1]}` : '';
  return [...new Set([name, cleaned, compact, ...parts].map(normalize).filter(Boolean))];
}

function cleanBusinessName(name) {
  return String(name || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/주식회사|유한회사|\(주\)|㈜|직영|지점|점|세차장|주유소/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferPlaceTokens(carwash) {
  const text = `${carwash.name} ${carwash.roadAddress} ${carwash.lotAddress} ${carwash.dong} ${(carwash.querySignals || []).join(' ')}`;
  const rules = ['송도', '청라', '검단', '부평', '영종', '영종도', '강남', '역삼', '압구정', '청담', '삼성', '잠실', '송파', '마곡', '목동', '영등포', '여의도', '신림', '서초', '양재', '홍대', '합정', '성수', '왕십리', '건대', '천호', '강동', '노원', '은평', '홍제', '홍제역', '구로', '가산', '동대문', '오송', '정관', '상무', '월평로'];
  return rules.filter((token) => text.includes(token));
}

function inferRoadTokens(carwash) {
  const road = String(carwash.roadAddress || '');
  const matches = road.match(/[가-힣]+(?:로|길)\s*\d+(?:-\d+)?/g) || [];
  return matches.map((token) => token.replace(/\s+/g, ' ').trim());
}

function normalize(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}
