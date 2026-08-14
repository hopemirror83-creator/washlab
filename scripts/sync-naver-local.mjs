import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv, requireEnv } from './env.mjs';

await loadEnv();
requireEnv(['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET']);

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(ROOT, 'data', 'naver-local-carwashes.json');
const DISPLAY = Number(process.env.NAVER_LOCAL_DISPLAY || 5);
const DELAY_MS = Number(process.env.NAVER_LOCAL_DELAY_MS || 450);
const TARGET_CITIES = (process.env.TARGET_CITIES || 'incheon,seoul,gyeonggi,busan,daegu,daejeon,gwangju,ulsan,sejong,gangwon,chungbuk,chungnam,jeonbuk,jeonnam,gyeongbuk,gyeongnam,jeju')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const MERGE_EXISTING = process.env.MERGE_EXISTING !== '0';

const CITY_CONFIGS = {
  incheon: {
    city: "인천",
    cityLabel: "인천",
    cityPattern: /인천/,
    districts: ["제물포구","영종구","미추홀구","연수구","남동구","부평구","계양구","서해구","검단구","강화군","옹진군","중구","동구","서구"],
    places: ["송도","청라","검단","부평","부평역","구월","논현","주안","계산","작전","영종","영종도","운서","강화","마전","검암","만수","동춘","검단신도시","루원시티","가정역","청라국제도시","송도국제도시","인천공항","제물포","동인천"],
    brands: ['컴인워시 인천', '킹콩샤워 인천', '워시멜로우 인천', '워시존 인천', '오토스테이 인천', '디케이워시 인천', '노터치세차 인천', '노브러쉬세차 인천'],
    priorityQueries: ['영종도 노터치 자동세차', '인천공항 세차장', '웰컴워시 송도점'],
  },
  seoul: {
    city: "서울",
    cityLabel: "서울",
    cityPattern: /서울/,
    districts: ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
    places: ["강남","역삼","논현","압구정","청담","삼성","잠실","송파","문정","마곡","발산","가양","목동","영등포","여의도","신림","봉천","사당","상도","서초","양재","방배","합정","상암","마포","공덕","신촌","연남","홍대","홍제","홍제역","용산","한남","성수","왕십리","건대","구의","천호","길동","암사","둔촌","명일","노원","상계","창동","방학","쌍문","수유","미아","구로","가산","금천","독산","동대문","장안","전농","청량리","중랑","면목","망우","은평","불광","연신내","사당로"],
    brands: ['컴인워시 서울', '킹콩샤워 서울', '워시멜로우 서울', '워시존 서울', '오토스테이 서울', '디케이워시 서울', '노터치세차 서울', '노브러쉬세차 서울'],
    priorityQueries: ['홍제역 부근 셀프세차장', '장스타 실내 내부세차', '사당로9다길 세차장'],
  },
  gyeonggi: {
    city: "경기",
    cityLabel: "경기",
    cityPattern: /경기|경기도/,
    districts: ["수원시","성남시","고양시","용인시","부천시","화성시","남양주시","안산시","안양시","평택시","시흥시","파주시","의정부시","김포시","광주시","광명시","군포시","하남시","오산시","양주시","이천시","구리시","안성시","포천시","의왕시","양평군","여주시","동두천시","과천시","가평군","연천군"],
    places: ["수원","영통","광교","인계동","권선","호매실","정자동","분당","야탑","판교","서현","위례","일산","능곡역","킨텍스","화정","백석","덕양","용인","수지","죽전","기흥","동백","처인","부천","중동","상동","송내","옥길","화성","동탄","병점","봉담","조암","발안로","벌음동","남양주","다산","별내","안산","고잔","상록","안양","평촌","범계","평택","송탄","고덕","지제","시흥","배곧","장현","파주","운정","문산","의정부","민락","김포","한강신도시","구래","광주","태전","광명","광명사거리","철산","군포","산본","하남","미사","감일","오산","양주","옥정","이천","구리","갈매","안성","공도","포천","의왕","양평","여주","동두천","과천","가평","연천"],
    brands: ['컴인워시 경기', '킹콩샤워 경기', '워시멜로우 경기', '워시존 경기', '오토스테이 경기', '디케이워시 경기', '노터치세차 경기', '노브러쉬세차 경기'],
    priorityQueries: ['조암 노터치세차장', '손세차 벌음동 발안로', '에이티에스 디테일링'],
  },
  busan: {
    city: "부산",
    cityLabel: "부산",
    cityPattern: /부산/,
    districts: ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
    places: ["해운대","센텀","광안리","서면","남포","사상","동래","명지","정관","기장","장산","연산","수영","개금"],
    brands: ['컴인워시 부산', '킹콩샤워 부산', '워시멜로우 부산', '워시존 부산', '노터치세차 부산'],
    priorityQueries: ['정관 노터치 세차', '개금 노터치세차', '광안리 sk엔크린'],
  },
  daegu: {
    city: "대구",
    cityLabel: "대구",
    cityPattern: /대구/,
    districts: ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],
    places: ["동성로","수성","범어","침산","칠곡","성서","월배","죽전","대곡","대천","현풍","테크노폴리스","군위"],
    brands: ['컴인워시 대구', '킹콩샤워 대구', '워시멜로우 대구', '워시존 대구', '노터치세차 대구'],
    priorityQueries: ['컴인워시 대구 대천', '워시존 대구현풍', '군위 이지스팀세차', '제이보스카케어'],
  },
  daejeon: {
    city: "대전",
    cityLabel: "대전",
    cityPattern: /대전/,
    districts: ["동구","중구","서구","유성구","대덕구"],
    places: ["둔산","유성","관평","노은","대덕","도안","가수원","용전","은행","신탄진"],
    brands: ['컴인워시 대전', '킹콩샤워 대전', '워시멜로우 대전', '워시존 대전', '노터치세차 대전'],
    priorityQueries: ['신탄진 셀프세차장 개러지', '에이비디테일링'],
  },
  gwangju: {
    city: "광주",
    cityLabel: "광주",
    cityPattern: /광주광역시|광주/,
    districts: ["동구","서구","남구","북구","광산구"],
    places: ["상무","상무지구","첨단","수완","운암","일곡","봉선","송정","하남","풍암"],
    brands: ['컴인워시 광주', '킹콩샤워 광주', '워시멜로우 광주', '워시존 광주', '노터치세차 광주'],
    priorityQueries: ['상무지구 노터치 세차'],
  },
  ulsan: {
    city: "울산",
    cityLabel: "울산",
    cityPattern: /울산/,
    districts: ["중구","남구","동구","북구","울주군"],
    places: ["삼산","무거","달동","태화","성남","방어진","명촌","호계","언양","온산","월평로","유곡동","다운"],
    brands: ['컴인워시 울산', '킹콩샤워 울산', '워시멜로우 울산', '워시존 울산', '노터치세차 울산'],
    priorityQueries: ['울산 월평로 노브러쉬세차', '울산 삼산 금보화', '울산 유곡동 오토카지', '다운 실내세차 내부세차 실내크리닝 에바크리닝'],
  },
  sejong: {
    city: "세종",
    cityLabel: "세종",
    cityPattern: /세종/,
    districts: ["세종시"],
    places: ["조치원","나성","도담","아름","종촌","보람","새롬","고운","소담","대평"],
    brands: ['컴인워시 세종', '킹콩샤워 세종', '워시멜로우 세종', '워시존 세종', '노터치세차 세종'],
  },
  gangwon: {
    city: "강원",
    cityLabel: "강원",
    cityPattern: /강원|강원도|강원특별자치도/,
    districts: ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
    places: ["춘천","원주","원주IC","강릉","속초","동해","삼척","홍천","횡성","평창","정선","양양"],
    brands: ['컴인워시 강원', '킹콩샤워 강원', '워시멜로우 강원', '워시존 강원', '노터치세차 강원'],
    priorityQueries: ['와이퍼 개러지 원주 ic'],
  },
  chungbuk: {
    city: "충북",
    cityLabel: "충북",
    cityPattern: /충북|충청북도/,
    districts: ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
    places: ["청주","오송","오창","율량","산남","충주","서충주","제천","진천","음성","혁신도시","단양"],
    brands: ['컴인워시 충북', '킹콩샤워 충북', '워시멜로우 충북', '워시존 충북', '노터치세차 충북'],
    priorityQueries: ['오송세차장 위치', '오송 하부디테일링 세차', '서충주 보글보글워시세차장', '보글보글워시세차장'],
  },
  chungnam: {
    city: "충남",
    cityLabel: "충남",
    cityPattern: /충남|충청남도/,
    districts: ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
    places: ["천안","아산","불당","두정","배방","탕정","공주","보령","서산","논산","계룡","당진","홍성","내포","태안"],
    brands: ['컴인워시 충남', '킹콩샤워 충남', '워시멜로우 충남', '워시존 충남', '노터치세차 충남'],
  },
  jeonbuk: {
    city: "전북",
    cityLabel: "전북",
    cityPattern: /전북|전라북도|전북특별자치도/,
    districts: ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
    places: ["전주","완산","덕진","군산","수송","익산","모현","정읍","남원","김제","완주","혁신도시"],
    brands: ['컴인워시 전북', '킹콩샤워 전북', '워시멜로우 전북', '워시존 전북', '노터치세차 전북'],
  },
  jeonnam: {
    city: "전남",
    cityLabel: "전남",
    cityPattern: /전남|전라남도/,
    districts: ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
    places: ["목포","여수","순천","나주","광양","무안","남악","화순","해남","영암","담양"],
    brands: ['컴인워시 전남', '킹콩샤워 전남', '워시멜로우 전남', '워시존 전남', '노터치세차 전남'],
  },
  gyeongbuk: {
    city: "경북",
    cityLabel: "경북",
    cityPattern: /경북|경상북도/,
    districts: ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
    places: ["포항","경주","구미","안동","경산","김천","영주","영천","상주","문경","칠곡","왜관","예천","울진"],
    brands: ['컴인워시 경북', '킹콩샤워 경북', '워시멜로우 경북', '워시존 경북', '노터치세차 경북'],
  },
  gyeongnam: {
    city: "경남",
    cityLabel: "경남",
    cityPattern: /경남|경상남도/,
    districts: ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
    places: ["창원","마산","진해","진주","김해","장유","율하","양산","물금","거제","통영","사천","밀양","창녕"],
    brands: ['컴인워시 경남', '킹콩샤워 경남', '워시멜로우 경남', '워시존 경남', '노터치세차 경남'],
  },
  jeju: {
    city: "제주",
    cityLabel: "제주",
    cityPattern: /제주|제주도|제주특별자치도/,
    districts: ["제주시","서귀포시"],
    places: ["제주","제주시","서귀포","애월","노형","연동","이도","아라","화북","조천","성산","중문"],
    brands: ['컴인워시 제주', '킹콩샤워 제주', '워시멜로우 제주', '워시존 제주', '노터치세차 제주'],
  },
};

const targetConfigs = TARGET_CITIES.map((key) => CITY_CONFIGS[key]).filter(Boolean);
if (!targetConfigs.length) throw new Error(`Unknown TARGET_CITIES: ${TARGET_CITIES.join(', ')}`);

const seen = new Map();
if (MERGE_EXISTING) {
  for (const item of await readJsonIfExists(OUTPUT_FILE, [])) {
    if (!item.cityLabel || !Object.values(CITY_CONFIGS).some((config) => config.cityLabel === item.cityLabel)) continue;
    if (!looksLikeCarwash(item)) continue;
    seen.set(buildKey(item), item);
  }
}

const queries = targetConfigs.flatMap(buildQueries);

for (const [index, entry] of queries.entries()) {
  console.log(`Naver local search ${index + 1}/${queries.length}: ${entry.query}`);
  const items = await searchLocal(entry.query);
  for (const item of items) {
    const normalized = normalizeItem(item, entry);
    if (!isInTargetArea(normalized, entry.config)) continue;
    if (!looksLikeCarwash(normalized)) continue;
    const key = buildKey(normalized);
    const old = seen.get(key);
    seen.set(key, old ? mergeSeen(old, normalized) : normalized);
  }
  await sleep(DELAY_MS);
}

const results = [...seen.values()].sort(
  (a, b) =>
    cityOrder(a.cityLabel) - cityOrder(b.cityLabel) ||
    scoreItem(b) - scoreItem(a) ||
    String(a.district || '').localeCompare(String(b.district || ''), 'ko') ||
    String(a.name || '').localeCompare(String(b.name || ''), 'ko'),
);

await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
await writeFile(OUTPUT_FILE, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`Naver local carwashes: ${results.length}`);

function buildQueries(config) {
  if (process.env.PRIORITY_ONLY === '1') {
    return unique(config.priorityQueries || []).map((query) => ({ query, config }));
  }
  const metro = ['인천', '서울', '경기'].includes(config.cityLabel);
  const intentWords = metro
    ? ['세차장', '셀프세차장', '손세차', '자동세차', '노터치세차', '노브러쉬세차', '실내세차', '내부세차', '하부세차', '무료진공청소기 세차장', '24시간 세차장', '디테일링 세차']
    : ['세차장', '셀프세차장', '손세차', '자동세차', '노터치세차', '하부세차', '무료진공청소기 세차장', '24시간 세차장'];
  const placeIntentWords = metro
    ? ['세차장', '셀프세차장', '손세차', '자동세차', '노터치세차', '노브러쉬세차', '실내세차', '하부세차']
    : ['세차장', '셀프세차장', '손세차', '노터치세차'];
  return unique([
    ...intentWords.map((intent) => `${config.city} ${intent}`),
    ...config.districts.flatMap((district) => [
      ...intentWords.map((intent) => `${config.city} ${district} ${intent}`),
    ]),
    ...config.places.flatMap((place) => [
      ...placeIntentWords.map((intent) => `${place} ${intent}`),
    ]),
    ...config.brands,
    ...(config.priorityQueries || []),
  ]).map((query) => ({ query, config }));
}

async function searchLocal(query) {
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', String(DISPLAY));
  url.searchParams.set('start', '1');
  url.searchParams.set('sort', 'random');

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Naver local search failed (${response.status}): ${body}`);
  }

  const json = await response.json();
  return json.items || [];
}

function normalizeItem(item, entry) {
  const name = cleanHtml(item.title);
  const category = cleanHtml(item.category);
  const roadAddress = cleanHtml(item.roadAddress);
  const lotAddress = cleanHtml(item.address);
  const addressText = `${roadAddress} ${lotAddress}`;
  const district = inferDistrict(addressText, entry.config);
  const dong = inferDong(addressText, entry.config);
  const searchText = `${name} ${roadAddress || lotAddress}`.trim();

  return {
    source: 'naver-local',
    sourceId: `naver-local-${slugify(`${entry.config.cityLabel}-${name}-${roadAddress || lotAddress}`)}`,
    cityLabel: entry.config.cityLabel,
    name,
    category,
    roadAddress,
    lotAddress,
    district,
    dong,
    phone: cleanHtml(item.telephone) || '정보 없음',
    mapx: item.mapx ? Number(item.mapx) : 0,
    mapy: item.mapy ? Number(item.mapy) : 0,
    link: item.link || '',
    naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(searchText)}`,
    querySignals: [entry.query],
  };
}

function mergeSeen(old, item) {
  return {
    ...old,
    cityLabel: old.cityLabel || item.cityLabel,
    phone: old.phone && old.phone !== '정보 없음' ? old.phone : item.phone,
    roadAddress: old.roadAddress || item.roadAddress,
    lotAddress: old.lotAddress || item.lotAddress,
    district: old.district || item.district,
    dong: old.dong || item.dong,
    mapx: old.mapx || item.mapx,
    mapy: old.mapy || item.mapy,
    naverMapUrl: old.naverMapUrl || item.naverMapUrl,
    querySignals: unique([...(old.querySignals || []), ...(item.querySignals || [])]),
  };
}

function isInTargetArea(item, config) {
  const text = `${item.roadAddress} ${item.lotAddress}`;
  return config.cityPattern.test(text) && Boolean(item.district);
}

function looksLikeCarwash(item) {
  const name = String(item.name || '');
  const category = String(item.category || '');
  const address = `${item.roadAddress || ''} ${item.lotAddress || ''}`;
  const text = `${name} ${category} ${address} ${(item.querySignals || []).join(' ')}`;
  if (/입구|출장|출장정비|대리|렌트카|오피스텔|아파트|경매|용품만|빨래방|붙임머리|가발|외국인학교|청소차고지|폐차|방수|누수|에폭시|옥상|외벽|수리,AS|컴퓨터|노트북|데이터복구|부동산|중개업|오토바이|바이크|투\s*휠|타이어,휠|무료 셀프서비스|요새|운영 종료/i.test(text)) return false;
  const categoryLooksLikeCarwash = /세차|스팀세차|셀프세차/i.test(category);
  const nameLooksLikeCarwash = /세차|셀프|자동|노터치|노브러시|광택|디테일|카워시|wash|워시|킹콩샤워|컴인워시|오토스테이/i.test(name);
  return categoryLooksLikeCarwash || nameLooksLikeCarwash;
}

function scoreItem(item) {
  const text = `${item.name} ${item.category} ${(item.querySignals || []).join(' ')}`;
  let score = item.querySignals?.length || 0;
  if (/셀프세차|킹콩샤워|카워시|wash|워시/i.test(text)) score += 5;
  if (/24시간|24시|하부세차|무료진공|진공청소|노터치|노브러시/i.test(text)) score += 3;
  if (item.phone && item.phone !== '정보 없음') score += 1;
  return score;
}

function buildKey(item) {
  const address = normalizeText(item.roadAddress || item.lotAddress);
  const name = normalizeText(item.name);
  return address ? `${name}|${address}` : `${item.cityLabel}|${name}`;
}

function inferDistrict(address, config) {
  if (config.cityLabel === '세종' && /세종|세종특별자치시/.test(String(address || ''))) return '세종시';
  return config.districts.find((district) => String(address || '').includes(district)) || '';
}

function inferDong(address, config) {
  const districtPattern = new RegExp(config.districts.join('|'), 'g');
  const cleaned = String(address || '').replace(config.cityPattern, ' ').replace(districtPattern, ' ');
  const match = cleaned.match(/([가-힣0-9]+(?:동|읍|면|리))(?:\s|$)/);
  return match?.[1] || '';
}

function cleanHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/[^\w\s가-힣-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cityOrder(cityLabel) {
  const order = ["인천","서울","경기","부산","대구","대전","광주","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"];
  const index = order.indexOf(cityLabel);
  return index === -1 ? 99 : index;
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}
