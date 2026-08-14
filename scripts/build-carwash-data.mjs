import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const CSV_FILE = path.join(ROOT, '세차장정보.csv');
const DATA_FILE = path.join(ROOT, 'data', 'carwashes.incheon.json');
const LEGACY_DATA_FILE = path.join(ROOT, 'data', 'carwashes.incheon-seogu.json');
const GENERATED_PAGE_FILE = path.join(ROOT, 'data', 'generated-carwash-pages.json');
const NAVER_LOCAL_FILE = path.join(ROOT, 'data', 'naver-local-carwashes.json');
const NAVER_REVIEW_FILE = path.join(ROOT, 'data', 'naver-review-sources.json');
const SUPPRESSED_CARWASH_FILE = path.join(ROOT, 'data', 'suppressed-carwashes.json');
const OUTPUT_FILE = path.join(ROOT, 'src', 'data', 'siteData.ts');

const CITY_CONFIGS = {
  인천: {
    slug: "incheon",
    fullName: "인천광역시",
    aliases: ["인천","인천광역시"],
    districts: ["제물포구","영종구","미추홀구","연수구","남동구","부평구","계양구","서해구","검단구","강화군","옹진군","중구","동구","서구"],
    places: ["송도","청라","검단","부평","부평역","구월","논현","주안","계산","작전","영종","영종도","운서","인천공항","강화","마전","검암","만수","동춘","검단신도시","루원시티","가정역","청라국제도시","송도국제도시","제물포","동인천"],
  },
  서울: {
    slug: "seoul",
    fullName: "서울특별시",
    aliases: ["서울","서울특별시"],
    districts: ["종로구","중구","용산구","성동구","광진구","동대문구","중랑구","성북구","강북구","도봉구","노원구","은평구","서대문구","마포구","양천구","강서구","구로구","금천구","영등포구","동작구","관악구","서초구","강남구","송파구","강동구"],
    places: ["강남","역삼","논현","압구정","청담","삼성","잠실","송파","문정","마곡","발산","가양","목동","영등포","여의도","신림","봉천","사당","상도","서초","양재","방배","합정","상암","마포","공덕","신촌","연남","홍대","홍제","홍제역","용산","한남","성수","왕십리","건대","구의","천호","길동","암사","둔촌","명일","노원","상계","창동","방학","쌍문","수유","미아","구로","가산","금천","독산","동대문","장안","전농","청량리","중랑","면목","망우","은평","불광","연신내","사당로"],
  },
  경기: {
    slug: "gyeonggi",
    fullName: "경기도",
    aliases: ["경기","경기도"],
    districts: ["수원시","성남시","고양시","용인시","부천시","화성시","남양주시","안산시","안양시","평택시","시흥시","파주시","의정부시","김포시","광주시","광명시","군포시","하남시","오산시","양주시","이천시","구리시","안성시","포천시","의왕시","양평군","여주시","동두천시","과천시","가평군","연천군"],
    places: ["수원","영통","광교","인계동","권선","호매실","정자동","분당","야탑","판교","서현","위례","일산","능곡역","킨텍스","화정","백석","덕양","용인","수지","죽전","기흥","동백","처인","부천","중동","상동","송내","옥길","화성","동탄","병점","봉담","조암","발안로","벌음동","남양주","다산","별내","안산","고잔","상록","안양","평촌","범계","평택","송탄","고덕","지제","시흥","배곧","장현","파주","운정","문산","의정부","민락","김포","한강신도시","구래","광주","태전","광명","광명사거리","철산","군포","산본","하남","미사","감일","오산","양주","옥정","이천","구리","갈매","안성","공도","포천","의왕","양평","여주","동두천","과천","가평","연천"],
  },
  부산: {
    slug: "busan",
    fullName: "부산광역시",
    aliases: ["부산","부산광역시"],
    districts: ["중구","서구","동구","영도구","부산진구","동래구","남구","북구","해운대구","사하구","금정구","강서구","연제구","수영구","사상구","기장군"],
    places: ["해운대","센텀","광안리","서면","남포","사상","동래","명지","정관","기장","장산","연산","수영","개금"],
  },
  대구: {
    slug: "daegu",
    fullName: "대구광역시",
    aliases: ["대구","대구광역시"],
    districts: ["중구","동구","서구","남구","북구","수성구","달서구","달성군","군위군"],
    places: ["동성로","수성","범어","침산","칠곡","성서","월배","죽전","대곡","대천","현풍","테크노폴리스","군위"],
  },
  대전: {
    slug: "daejeon",
    fullName: "대전광역시",
    aliases: ["대전","대전광역시"],
    districts: ["동구","중구","서구","유성구","대덕구"],
    places: ["둔산","유성","관평","노은","대덕","도안","가수원","용전","은행","신탄진"],
  },
  광주: {
    slug: "gwangju",
    fullName: "광주광역시",
    aliases: ["광주광역시"],
    districts: ["동구","서구","남구","북구","광산구"],
    places: ["상무","상무지구","첨단","수완","운암","일곡","봉선","송정","하남","풍암"],
  },
  울산: {
    slug: "ulsan",
    fullName: "울산광역시",
    aliases: ["울산","울산광역시"],
    districts: ["중구","남구","동구","북구","울주군"],
    places: ["삼산","무거","달동","태화","성남","방어진","명촌","호계","언양","온산","월평로","유곡동","다운"],
  },
  세종: {
    slug: "sejong",
    fullName: "세종특별자치시",
    aliases: ["세종","세종특별자치시","세종시"],
    districts: ["세종시"],
    places: ["조치원","나성","도담","아름","종촌","보람","새롬","고운","소담","대평"],
  },
  강원: {
    slug: "gangwon",
    fullName: "강원특별자치도",
    aliases: ["강원","강원도","강원특별자치도"],
    districts: ["춘천시","원주시","강릉시","동해시","태백시","속초시","삼척시","홍천군","횡성군","영월군","평창군","정선군","철원군","화천군","양구군","인제군","고성군","양양군"],
    places: ["춘천","원주","원주IC","강릉","속초","동해","삼척","홍천","횡성","평창","정선","양양"],
  },
  충북: {
    slug: "chungbuk",
    fullName: "충청북도",
    aliases: ["충북","충청북도"],
    districts: ["청주시","충주시","제천시","보은군","옥천군","영동군","증평군","진천군","괴산군","음성군","단양군"],
    places: ["청주","오송","오창","율량","산남","충주","서충주","제천","진천","음성","혁신도시","단양"],
  },
  충남: {
    slug: "chungnam",
    fullName: "충청남도",
    aliases: ["충남","충청남도"],
    districts: ["천안시","공주시","보령시","아산시","서산시","논산시","계룡시","당진시","금산군","부여군","서천군","청양군","홍성군","예산군","태안군"],
    places: ["천안","아산","불당","두정","배방","탕정","공주","보령","서산","논산","계룡","당진","홍성","내포","태안"],
  },
  전북: {
    slug: "jeonbuk",
    fullName: "전북특별자치도",
    aliases: ["전북","전라북도","전북특별자치도"],
    districts: ["전주시","군산시","익산시","정읍시","남원시","김제시","완주군","진안군","무주군","장수군","임실군","순창군","고창군","부안군"],
    places: ["전주","완산","덕진","군산","수송","익산","모현","정읍","남원","김제","완주","혁신도시"],
  },
  전남: {
    slug: "jeonnam",
    fullName: "전라남도",
    aliases: ["전남","전라남도"],
    districts: ["목포시","여수시","순천시","나주시","광양시","담양군","곡성군","구례군","고흥군","보성군","화순군","장흥군","강진군","해남군","영암군","무안군","함평군","영광군","장성군","완도군","진도군","신안군"],
    places: ["목포","여수","순천","나주","광양","무안","남악","화순","해남","영암","담양"],
  },
  경북: {
    slug: "gyeongbuk",
    fullName: "경상북도",
    aliases: ["경북","경상북도"],
    districts: ["포항시","경주시","김천시","안동시","구미시","영주시","영천시","상주시","문경시","경산시","의성군","청송군","영양군","영덕군","청도군","고령군","성주군","칠곡군","예천군","봉화군","울진군","울릉군"],
    places: ["포항","경주","구미","안동","경산","김천","영주","영천","상주","문경","칠곡","왜관","예천","울진"],
  },
  경남: {
    slug: "gyeongnam",
    fullName: "경상남도",
    aliases: ["경남","경상남도"],
    districts: ["창원시","진주시","통영시","사천시","김해시","밀양시","거제시","양산시","의령군","함안군","창녕군","고성군","남해군","하동군","산청군","함양군","거창군","합천군"],
    places: ["창원","마산","진해","진주","김해","장유","율하","양산","물금","거제","통영","사천","밀양","창녕"],
  },
  제주: {
    slug: "jeju",
    fullName: "제주특별자치도",
    aliases: ["제주","제주특별자치도","제주도"],
    districts: ["제주시","서귀포시"],
    places: ["제주","제주시","서귀포","애월","노형","연동","이도","아라","화북","조천","성산","중문"],
  },
};

const TARGET_CITY_LABELS = (process.env.SITE_CITIES || '인천,서울,경기,부산,대구,대전,광주,울산,세종,강원,충북,충남,전북,전남,경북,경남,제주')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => CITY_CONFIGS[value]);

function isCityRow(value, config) {
  const text = clean(value);
  return (config?.aliases || [config?.fullName]).some((alias) => text.includes(alias));
}

const raw = new TextDecoder('euc-kr').decode(await readFile(CSV_FILE));
const rows = parseCsv(raw);
const generatedPages = await readJsonIfExists(GENERATED_PAGE_FILE, []);
const naverLocalRows = await readJsonIfExists(NAVER_LOCAL_FILE, []);
const naverReviewRows = await readJsonIfExists(NAVER_REVIEW_FILE, []);
const suppressedCarwashes = await readJsonIfExists(SUPPRESSED_CARWASH_FILE, []);
const generatedPageMap = new Map(generatedPages.map((page) => [page.sourceId, page]));
const generatedPageLookup = buildGeneratedPageLookup(generatedPages);
const generatedNameIndex = buildGeneratedNameIndex(generatedPages);
const naverReviewMap = new Map(naverReviewRows.map((group) => [group.sourceId, group]));

const publicItems = rows
  .filter((row) => TARGET_CITY_LABELS.some((cityLabel) => isCityRow(row.시도명, CITY_CONFIGS[cityLabel])))
  .map(normalizePublicCarwash)
  .filter((item) => !isSuppressedCarwash(item))
  .map(mergeGeneratedPage)
  .filter((item) => item.name && item.cityLabel && item.district && (item.roadAddress || item.lotAddress));

const naverLocalItems = naverLocalRows
  .map(normalizeNaverLocalCarwash)
  .filter((item) => !isSuppressedCarwash(item))
  .filter((item) => TARGET_CITY_LABELS.includes(item.cityLabel))
  .filter(looksLikeCarwashItem)
  .map(mergeGeneratedPage)
  .filter((item) => item.name && item.cityLabel && item.district && (item.roadAddress || item.lotAddress));

function isSuppressedCarwash(item) {
  const itemSourceId = clean(item?.sourceId);
  const itemName = clean(item?.name);
  const itemAddress = clean(`${item?.roadAddress || ''} ${item?.lotAddress || ''}`);

  return suppressedCarwashes.some((entry) => {
    if (entry.sourceId && itemSourceId === clean(entry.sourceId)) return true;
    if (entry.name && itemName === clean(entry.name)) return true;
    return (entry.addresses || []).some((address) => itemAddress.includes(clean(address)));
  });
}

const items = mergeExternalItems(naverLocalItems, publicItems, { appendExternal: false })
  .map(applyRankingMetadata)
  .sort(compareCarwashes);

const groups = buildGroups(items);
const types = buildTypes(items);

await mkdir(path.dirname(DATA_FILE), { recursive: true });
await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
await writeFile(DATA_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
await writeFile(LEGACY_DATA_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
await writeFile(
  OUTPUT_FILE,
  `export const carwashes = JSON.parse(${toJsonStringLiteral(items)}) as any[];\n\nexport const areaGroups = JSON.parse(${toJsonStringLiteral(groups)}) as any[];\n\nexport const typeGroups = JSON.parse(${toJsonStringLiteral(types)}) as any[];\n`,
  'utf8',
);

console.log(`Wrote ${path.relative(ROOT, DATA_FILE)}`);
console.log(`Wrote ${path.relative(ROOT, LEGACY_DATA_FILE)}`);
console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
console.log(`Carwashes: ${items.length}`);
console.log(`Area pages: ${groups.length}`);
console.log(`Type pages: ${types.length}`);

function parseCsv(text) {
  const records = [];
  let field = '';
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === ',' && !quoted) {
      row.push(field);
      field = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) records.push(row);
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (field || row.length) {
    row.push(field);
    records.push(row);
  }

  const [header, ...body] = records;
  return body.map((record) => Object.fromEntries(header.map((key, index) => [key, (record[index] || '').trim()])));
}

function normalizePublicCarwash(row) {
  const cityLabel = inferCityLabel(row.시도명);
  const config = CITY_CONFIGS[cityLabel];
  const roadAddress = clean(row.소재지도로명주소);
  const lotAddress = clean(row.소재지지번주소);
  const name = clean(row.사업장명);
  const dong = inferDong(`${roadAddress} ${lotAddress}`, config);
  const inferredDistrict = inferDistrict(`${roadAddress} ${lotAddress}`, config);
  const district = normalizeIncheonDistrict({
    cityLabel,
    district: preferInferredDistrict(clean(row.시군구명), inferredDistrict) || inferredDistrict,
    dong,
    addressText: `${roadAddress} ${lotAddress} ${name}`,
  });
  const areaLabel = buildAreaLabel(cityLabel, district, dong);
  const flags = inferFlagsFromText(`${name} ${row.사업장업종명} ${row.세차유형} ${row.세차요금정보}`, {
    priceKnown: Boolean(clean(row.세차요금정보)),
    phoneKnown: Boolean(clean(row.세차장전화번호)),
    hoursKnown: Boolean(clean(row.평일운영시작시각) || clean(row.평일운영종료시각)),
  });

  return {
    source: 'public-data',
    sourceId: clean(row.관리번호),
    slug: slugify(`${config.slug}-${carwashDistrictSlug(cityLabel, district)}-${dong || 'carwash'}-${name}-${row.관리번호}`),
    name,
    city: clean(row.시도명),
    cityLabel,
    district,
    dong,
    areaLabel,
    title: `${areaLabel} ${name} 세차장 위치, 요금, 후기`,
    metaDescription: `${areaLabel} ${name} 세차장의 주소, 전화번호, 운영시간, 세차유형, 요금 정보와 방문 전 확인할 점을 정리했습니다.`,
    category: clean(row.사업장업종명) || '세차',
    washType: clean(row.세차유형) || '자동차세차',
    roadAddress,
    lotAddress,
    closedDays: clean(row.휴무일) || '정보 없음',
    weekdayHours: formatHours(row.평일운영시작시각, row.평일운영종료시각),
    holidayHours: formatHours(row.휴일운영시작시각, row.휴일운영종료시각),
    feeInfo: clean(row.세차요금정보) || '요금 정보 없음',
    phone: clean(row.세차장전화번호) || '정보 없음',
    permitNo: clean(row.수질허가번호),
    lat: toNumber(row.WGS84위도),
    lng: toNumber(row.WGS84경도),
    dataBaseDate: clean(row.데이터기준일자),
    dataUpdatedAt: clean(row.최종수정시점) || clean(row.데이터갱신시점),
    naverMapUrl: buildNaverMapUrl(name, roadAddress || lotAddress),
    flags,
    serviceLabels: buildServiceLabels(flags, row.세차유형 || row.사업장업종명),
    introSection: `${name}은 ${areaLabel}에서 확인되는 세차장입니다. 주소는 ${roadAddress || lotAddress || '정보 없음'}이며, 방문 전 네이버 지도에서 현재 영업 여부와 최근 사진을 함께 확인하는 것이 좋습니다.`,
    facilitySection: buildFacilitySection(flags, row.세차유형 || row.사업장업종명),
    fieldCheckSection: buildFieldCheckSection({ name, roadAddress, lotAddress, phone: clean(row.세차장전화번호), weekdayHours: formatHours(row.평일운영시작시각, row.평일운영종료시각), feeInfo: clean(row.세차요금정보) }),
    reviewSection: '네이버 검색 후기가 많지는 않습니다. 네이버 지도에 등록된 업체 정보와 최근 사진을 확인하고, 운영 여부와 이용 가능한 시설은 방문 전 업체에 한 번 더 확인해 주세요.',
    hasReviews: false,
    sourceCount: 0,
    sourceLinks: [],
    sourceRefs: [],
    positivePoints: [],
    conclusionSection: '',
    cautionPoints: buildCautionPoints(flags),
  };
}

function normalizeNaverLocalCarwash(row) {
  const cityLabel = clean(row.cityLabel) || inferCityLabel(`${row.roadAddress} ${row.lotAddress}`);
  if (!cityLabel) return {};
  const config = CITY_CONFIGS[cityLabel];
  const roadAddress = normalizeKnownAddressText(row.roadAddress);
  const lotAddress = normalizeKnownAddressText(row.lotAddress);
  const name = clean(row.name);
  const sourceId = clean(row.sourceId);
  const slugSource = normalizeKnownAddressText(sourceId) || roadAddress || lotAddress;
  const addressText = `${roadAddress} ${lotAddress}`;
  const inferredDistrict = inferDistrict(addressText, config);
  const rawDistrict = preferInferredDistrict(clean(row.district), inferredDistrict) || inferredDistrict;
  const inferredDong = inferDong(addressText, config);
  const rawDong = clean(row.dong);
  const district = normalizeIncheonDistrict({
    cityLabel,
    district: rawDistrict,
    dong: rawDong || inferredDong,
    addressText: `${addressText} ${name}`,
  });
  const dong = shouldPreferInferredDong(rawDong, district, inferredDong) ? inferredDong : rawDong || inferredDong;
  const areaLabel = buildAreaLabel(cityLabel, district, dong);
  const flags = inferFlagsFromText(`${name} ${row.category} ${(row.querySignals || []).join(' ')}`, {
    priceKnown: false,
    phoneKnown: clean(row.phone) && clean(row.phone) !== '정보 없음',
    hoursKnown: /24시간|24시|연중무휴/.test(`${name} ${row.category} ${(row.querySignals || []).join(' ')}`),
  });

  return {
    source: 'naver-local',
    sourceId: sourceId || `naver-local-${slugify(`${cityLabel}-${name}-${roadAddress || lotAddress}`)}`,
    querySignals: Array.isArray(row.querySignals) ? row.querySignals : [],
    slug: slugify(`${config.slug}-${carwashDistrictSlug(cityLabel, district)}-${dong || 'carwash'}-${name}-${slugSource}`),
    name,
    city: config.fullName,
    cityLabel,
    district,
    dong,
    areaLabel,
    title: `${areaLabel} ${name} 세차장 위치, 요금, 후기`,
    metaDescription: `${areaLabel} ${name} 세차장의 주소, 전화번호, 네이버 지도 정보와 방문 전 확인할 점을 정리했습니다.`,
    category: clean(row.category) || '세차',
    washType: flags.selfWash ? '셀프세차' : flags.handWash ? '손세차' : flags.automaticWash ? '자동세차' : '세차',
    roadAddress,
    lotAddress,
    closedDays: '정보 없음',
    weekdayHours: flags.hoursKnown ? '24시간 또는 연중무휴 여부 확인 필요' : '정보 없음',
    holidayHours: '정보 없음',
    feeInfo: '요금 정보 없음',
    phone: clean(row.phone) || '정보 없음',
    permitNo: '',
    lat: 0,
    lng: 0,
    mapx: row.mapx || 0,
    mapy: row.mapy || 0,
    dataBaseDate: '',
    dataUpdatedAt: new Date().toISOString().slice(0, 10),
    naverMapUrl: buildNaverMapUrl(name, roadAddress || lotAddress),
    flags,
    serviceLabels: buildServiceLabels(flags, row.category || '네이버 지도 확인'),
    introSection: `${name}은 ${areaLabel}에서 네이버 지도와 지역검색으로 확인되는 세차장입니다. 주소는 ${roadAddress || lotAddress || '정보 없음'}입니다.`,
    facilitySection: buildFacilitySection(flags, row.category || '네이버 지도 확인'),
    fieldCheckSection: buildFieldCheckSection({ name, roadAddress, lotAddress, phone: clean(row.phone), weekdayHours: flags.hoursKnown ? '24시간 또는 연중무휴 여부 확인 필요' : '', feeInfo: '' }),
    reviewSection: '네이버 검색 후기가 많지는 않습니다. 네이버 지도에 등록된 업체 정보와 최근 사진을 확인하고, 운영 여부와 이용 가능한 시설은 방문 전 업체에 한 번 더 확인해 주세요.',
    hasReviews: false,
    sourceCount: 0,
    sourceLinks: [],
    sourceRefs: [],
    positivePoints: [],
    conclusionSection: '',
    cautionPoints: buildCautionPoints(flags),
  };
}

function mergeGeneratedPage(item) {
  const page = findGeneratedPage(item);
  const reviewGroup = naverReviewMap.get(item.sourceId);
  const reviewSourceRefs = (reviewGroup?.sources || [])
    .filter((source) => source.link)
    .map((source) => ({ title: source.title || '네이버 블로그 후기', link: source.link }));

  if (!page) {
    return applyTemplatePolish({
      ...item,
      hasReviews: reviewSourceRefs.length > 0,
      sourceCount: reviewSourceRefs.length,
      sourceLinks: reviewSourceRefs.map((source) => source.link),
      sourceRefs: reviewSourceRefs,
    });
  }

  const usesReviewGroup = reviewSourceRefs.length > 0;
  const sourceRefs = usesReviewGroup ? reviewSourceRefs : Array.isArray(page.sourceRefs) ? page.sourceRefs : [];
  const sourceCount = usesReviewGroup ? sourceRefs.length : Number(page.sourceCount || 0) > 0 ? Number(page.sourceCount || 0) : sourceRefs.length;

  const merged = {
    ...item,
    hasReviews: Boolean(page.hasReviews || sourceCount > 0),
    sourceCount,
    sourceLinks: page.sourceLinks?.length ? page.sourceLinks : sourceRefs.map((source) => source.link),
    sourceRefs,
    introSection: page.introSection || item.introSection,
    facilitySection: page.facilitySection || item.facilitySection,
    reviewSection: page.reviewSection || item.reviewSection,
    fieldCheckSection: page.fieldCheckSection || item.fieldCheckSection,
    positivePoints: page.positivePoints || [],
    cautionPoints: page.cautionPoints || item.cautionPoints,
    conclusionSection: page.conclusionSection || '',
    contentUpdatedAt: page.updatedAt || '',
    aiProvider: page.aiProvider || '',
  };
  return enhancePriorityCarwashContent(applyTemplatePolish(merged), page);
}

function buildGeneratedPageLookup(pages) {
  const lookup = new Map();
  for (const page of pages) {
    const pageNames = getGeneratedPageNames(page);
    const keys = [
      page.sourceId,
      normalizeLoose(page.sourceId || ''),
      normalizeLoose(page.slug || ''),
      ...pageNames.flatMap((name) => [
        normalizeLoose(`${name} ${page.address || ''}`),
        normalizeLoose(`${name} ${page.roadAddress || ''}`),
        normalizeLoose(`${name} ${page.slug || ''}`),
        normalizeLoose(`${name} ${normalizeAddressCore(page.sourceId || page.slug || '')}`),
      ]),
    ].filter(Boolean);
    for (const key of keys) {
      if (!lookup.has(key)) lookup.set(key, page);
    }
  }
  return lookup;
}

function findGeneratedPage(item) {
  const direct = generatedPageMap.get(item.sourceId);
  if (direct) return direct;
  const keys = [
    normalizeLoose(item.sourceId || ''),
    normalizeLoose(`${item.name || ''} ${item.roadAddress || item.lotAddress || ''}`),
    normalizeLoose(`${item.name || ''} ${item.slug || ''}`),
  ].filter(Boolean);
  for (const key of keys) {
    const page = generatedPageLookup.get(key);
    if (page) return page;
  }
  const candidates = generatedNameIndex.get(normalizeLoose(item.name || '')) || [];
  if (candidates.length === 1) return candidates[0];
  const itemAddress = normalizeLoose(item.roadAddress || item.lotAddress || '');
  const directAddressMatch = candidates.find((page) => {
    const pageAddress = normalizeLoose(page.address || '');
    return itemAddress && pageAddress && (itemAddress.includes(pageAddress) || pageAddress.includes(itemAddress));
  });
  if (directAddressMatch) return directAddressMatch;

  const itemName = normalizeLoose(item.name || '');
  const itemAddressCore = normalizeAddressCore(item.roadAddress || item.lotAddress || item.sourceId || item.slug || '');
  const looseCandidates = candidates.filter((page) => {
    const pageHaystack = normalizeLoose(`${page.sourceId || ''} ${page.slug || ''} ${page.address || ''} ${page.roadAddress || ''}`);
    if (!itemName || !pageHaystack.includes(itemName)) return false;
    const pageAddressCore = normalizeAddressCore(`${page.sourceId || ''} ${page.slug || ''} ${page.address || ''} ${page.roadAddress || ''}`);
    return hasAddressOverlap(itemAddressCore, pageAddressCore);
  });
  if (looseCandidates.length === 1) return looseCandidates[0];
  return looseCandidates
    .sort((a, b) => Number(b.sourceCount || 0) - Number(a.sourceCount || 0))
    .find((page) => Number(page.sourceCount || 0) > 0);
}

function buildGeneratedNameIndex(pages) {
  const index = new Map();
  for (const page of pages) {
    for (const name of getGeneratedPageNames(page)) {
      const key = normalizeLoose(name);
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(page);
    }
  }
  return index;
}

function normalizeLoose(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function getGeneratedPageNames(page) {
  const values = [page.name, page.title];
  const sourceId = String(page.sourceId || '');
  const sourceMatch = sourceId.match(/naver-local-([^|]+?)(?:인천광역시|서울특별시|경기도|부산광역시|대구광역시|대전광역시|광주광역시|울산광역시|제주특별자치도)/);
  if (sourceMatch?.[1]) values.push(sourceMatch[1]);
  const slugParts = String(page.slug || '').split('-naver-local-');
  if (slugParts[1]) {
    const slugMatch = slugParts[1].match(/^(.+?)(?:인천광역시|서울특별시|경기도|부산광역시|대구광역시|대전광역시|광주광역시|울산광역시|제주특별자치도)/);
    if (slugMatch?.[1]) values.push(slugMatch[1].replaceAll('-', ' '));
  }
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function normalizeAddressCore(value) {
  return normalizeLoose(value)
    .replace(/대한민국/g, '')
    .replace(/인천광역시|서울특별시|경기도|부산광역시|대구광역시|대전광역시|광주광역시|울산광역시|제주특별자치도/g, '')
    .replace(/인천서구|서울|인천|경기|부산|대구|대전|광주|울산|제주/g, '')
    .replace(/서구|검단구|서해구|중구|동구|남구|미추홀구|연수구|남동구|부평구|계양구/g, '');
}

function hasAddressOverlap(a, b) {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aNumbers = a.match(/\d+/g) || [];
  const bNumbers = b.match(/\d+/g) || [];
  const sharedNumber = aNumbers.some((number) => bNumbers.includes(number));
  const aRoad = a.replace(/\d+/g, '');
  const bRoad = b.replace(/\d+/g, '');
  return sharedNumber && aRoad.length >= 3 && bRoad.length >= 3 && (aRoad.includes(bRoad) || bRoad.includes(aRoad));
}

function withSubject(value) {
  return `${value}${hasFinalConsonant(value) ? '은' : '는'}`;
}

function withObject(value) {
  return `${value}${hasFinalConsonant(value) ? '을' : '를'}`;
}

function hasFinalConsonant(value) {
  const text = String(value || '').trim();
  const char = text[text.length - 1];
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return /[013678]/.test(char);
  return (code - 0xac00) % 28 !== 0;
}

function clipMeta(value, max = 145) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function compactServiceLabel(item) {
  const haystack = `${item.name || ''} ${item.category || ''} ${item.washType || ''} ${(item.serviceLabels || []).join(' ')} ${(item.querySignals || []).join(' ')}`;
  if (/노터치|노브러쉬|노브러시/i.test(haystack)) return '노터치 자동세차';
  if (/자동세차|기계식/i.test(haystack)) return '자동세차';
  if (/스팀|손세차|디테일|광택|유리막|실내|내부/i.test(haystack)) return item.washType === '스팀세차' ? '스팀세차' : '손세차';
  if (/셀프|개러지|게러지/i.test(haystack)) return '셀프세차';
  return item.washType || '세차장';
}

function buildCarwashSeoTitle(item) {
  const area = item.areaLabel || [item.cityLabel, item.district, item.dong].filter(Boolean).join(' ');
  const service = compactServiceLabel(item);
  const reviewCount = Number(item.sourceCount || 0);
  const reviewWord = reviewCount > 0 ? '후기' : '방문 전 확인';
  const suffix = reviewCount >= 8 ? '후기, 운영시간, 요금' : `${reviewWord}, 운영시간, 지도`;
  return `${area} ${item.name} ${service} ${suffix}`;
}

function buildCarwashMetaDescription(item) {
  const area = item.areaLabel || [item.cityLabel, item.district, item.dong].filter(Boolean).join(' ');
  const service = compactServiceLabel(item);
  const reviewCount = Number(item.sourceCount || 0);
  const parts = [
    `${area} ${item.name} ${service} 정보입니다.`,
    '주소, 전화번호, 운영시간, 요금, 네이버 지도 바로가기를 정리했습니다.',
  ];
  if (reviewCount > 0) parts.push(`네이버 블로그 후기 ${reviewCount}건을 함께 참고했습니다.`);
  else parts.push('방문 전 네이버 지도에서 최신 영업 상태를 확인해 보세요.');
  return clipMeta(parts.join(' '));
}

function buildAreaSeoTitle({ label, type = '세차장', scope = 'area' }) {
  if (scope === 'city') return `${label} 세차장 추천 비교: 셀프세차, 손세차, 24시간, 후기`;
  if (type && type !== '세차장') return `${label} ${type} 추천 비교: 위치, 요금, 후기`;
  return `${label} 세차장 추천 비교: 셀프세차, 손세차, 후기`;
}

function buildAreaSeoDescription({ label, type = '세차장', count = 0, scope = 'area' }) {
  const countText = count ? `${count}곳을` : '확인되는 업체를';
  const baseType = type && type !== '세차장' ? type : '세차장';
  const guide =
    scope === 'city'
      ? '시군구별 목록과 주요 추천 후보를 함께 볼 수 있습니다.'
      : '추천 후보, 운영시간, 요금, 지도, 후기 여부를 한 번에 비교할 수 있습니다.';
  return clipMeta(`${label} ${baseType} ${countText} 정리했습니다. 셀프세차, 손세차, 자동세차, 24시간 여부와 네이버 지도 정보를 기준으로 ${guide}`);
}

function applyTemplatePolish(item) {
  const area = item.areaLabel || [item.cityLabel, item.district, item.dong].filter(Boolean).join(' ');
  const address = item.roadAddress || item.lotAddress || '주소 정보 없음';
  const labels = Array.isArray(item.serviceLabels) ? item.serviceLabels.filter(Boolean) : [];
  const typeLabel = item.washType || '세차';
  const hasReviews = Boolean(item.hasReviews && Number(item.sourceCount || 0) > 0);
  const reviewRefs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  const titleText = reviewRefs.map((source) => source.title || '').join(' ');
  const topicHints = buildTopicHints(`${item.name} ${item.category} ${typeLabel} ${labels.join(' ')} ${titleText}`);
  const nameSubject = withSubject(item.name);
  const typeObject = withObject(typeLabel);

  const introSection = `${nameSubject} ${area}에서 확인되는 ${typeLabel} 업체입니다. 주소는 ${address}이며, 워시랩에서는 네이버 지도에 등록된 위치와 업체명, 검색 결과에 보이는 세차 유형을 기준으로 정리했습니다. 방문 전에는 지도에서 영업 상태와 최근 사진을 함께 확인하는 편이 좋습니다.`;

  const facilitySection = hasReviews
    ? `${nameSubject} ${labels.length ? labels.slice(0, 4).join(', ') : typeLabel} 항목으로 살펴볼 수 있습니다. ${topicHints.facility} 실제 이용 가능 시설은 매장 운영 방식에 따라 달라질 수 있으므로, 세차 베이 대기, 진공청소기 위치, 매트 세척기, 하부세차 포함 여부는 네이버 지도 사진이나 현장 안내판을 같이 확인해 주세요.`
    : `${nameSubject} ${labels.length ? labels.slice(0, 4).join(', ') : typeLabel} 쪽으로 확인되는 업체입니다. 아직 블로그 후기가 많지 않은 곳은 시설을 단정하기보다 지도 사진과 업체 안내를 기준으로 보는 것이 안전합니다. 방문 전 운영시간, 요금, 진공청소기와 매트 세척기 사용 가능 여부를 확인해 주세요.`;

  const reviewSection = hasReviews
    ? item.reviewSection
    : `현재 워시랩에 정리된 네이버 블로그 후기는 많지 않습니다. 다만 ${area}에서 ${typeObject} 찾는 경우 위치와 기본 정보는 비교해볼 만합니다. 방문 전에는 네이버 지도에서 최근 사진, 영업 상태, 문의 가능 여부를 확인하고 이동하는 편이 좋습니다.`;

  const fieldCheckSection = `${item.name} 방문 전에는 주소와 영업 상태를 먼저 확인해 주세요. 지도상 주소는 ${address}입니다. ${knownPhone(item.phone) ? `전화번호는 ${item.phone}로 등록되어 있습니다.` : '전화번호가 보이지 않는 경우 네이버 지도 상세 화면에서 문의 방법을 확인해 주세요.'} ${buildHoursPlain(item)} ${buildPricePlain(item)} ${buildVisitPlain(item)}`;

  return {
    ...item,
    title: buildCarwashSeoTitle(item),
    metaDescription: buildCarwashMetaDescription(item),
    introSection,
    facilitySection,
    reviewSection,
    fieldCheckSection,
    cautionPoints: buildPlainCautions(item, topicHints),
    conclusionSection:
      item.conclusionSection ||
      `${area}에서 ${typeLabel} 업체를 찾고 있다면 ${item.name}의 위치, 운영시간, 후기 여부를 주변 세차장과 함께 비교해 보세요.`,
  };
}

function enhancePriorityCarwashContent(item, page = {}) {
  if (/gemini|vertex/i.test(String(page.aiProvider || ''))) return item;
  if (!isIncheonSeogu(item)) return item;
  const sourceCount = Number(item.sourceCount || page.sourceCount || 0);
  const priority = isPrioritySeoguCarwash(item, sourceCount);
  if (!priority) return item;

  const refs = Array.isArray(item.sourceRefs) ? item.sourceRefs : [];
  const titles = refs.map((source) => source.title || '').filter(Boolean);
  const combined = `${item.name} ${item.category} ${item.washType} ${item.serviceLabels?.join(' ') || ''} ${titles.join(' ')}`;
  const topic = buildTopicHints(combined);
  const area = item.areaLabel || `인천 서해구 ${item.dong || ''}`.trim();
  const address = item.roadAddress || item.lotAddress || '주소 정보 없음';
  const nameSubject = withSubject(item.name);
  const isNoTouch = /컴인워시|오토스테이|올댓워시|워시멜로우|노터치|노브러쉬|자동세차/i.test(combined);
  const isIndoor = /워시보이|킹콩샤워|실내|게러지|가라지/i.test(combined);

  const paragraphs = [];
  paragraphs.push(
    `네이버 블로그에서 ${sourceCount}건의 관련 글을 확인했습니다. 글 제목을 보면 ${topic.summary} 같은 내용이 반복됩니다. 워시랩에서는 이를 직접 이용 후기처럼 단정하지 않고, 방문 전 참고할 만한 의견으로 정리합니다.`,
  );
  if (isIndoor) {
    paragraphs.push(
      `${nameSubject} 실내형 또는 베이형 셀프세차를 찾는 이용자가 많이 살펴볼 만한 곳입니다. 후기 제목과 설명에서는 날씨 영향을 덜 받는 점, 세차 공간, 드라잉 공간, 장비 사용 흐름을 언급한 글이 보입니다. 겨울철이나 비가 오는 날처럼 외부 세차가 불편한 때에는 이런 구조가 장점으로 느껴질 수 있습니다.`,
    );
  } else if (isNoTouch) {
    paragraphs.push(
      `${nameSubject} 노터치나 자동세차 방식에 관심 있는 분이 비교해볼 만한 업체입니다. 관련 글에서는 짧은 시간에 세차를 끝내는 흐름, 코스 선택, 하부세차나 건조 구간 확인 같은 내용이 함께 보입니다. 차량에 직접 솔이 닿는 방식이 부담스러운 분이라면 코스 구성과 가격표를 먼저 확인하는 것이 좋습니다.`,
    );
  } else {
    paragraphs.push(
      `${item.name} 관련 글에서는 위치, 세차 방식, 장비 구성처럼 방문 전에 확인할 만한 정보가 주로 보입니다. 손세차나 디테일링 계열 업체라면 작업 범위와 예약 가능 여부에 따라 만족도가 달라질 수 있고, 셀프세차 계열이라면 베이 대기와 장비 상태를 보는 것이 좋습니다.`,
    );
  }
  paragraphs.push(
    `주소는 ${address}입니다. ${buildHoursPlain(item)} ${buildPricePlain(item)} 후기 작성 시점과 현재 운영 방식이 다를 수 있으니, 방문 전 네이버 지도 사진과 업체 안내를 한 번 더 확인해 주세요.`,
  );

  return {
    ...item,
    reviewSection: paragraphs.join(' '),
    positivePoints: buildEnhancedPositivePoints(topic, isIndoor, isNoTouch),
    cautionPoints: buildEnhancedCautionPoints(isIndoor, isNoTouch),
    fieldCheckSection: `${nameSubject} ${area}에서 ${withObject(item.washType || '세차')} 찾을 때 함께 비교해볼 만한 업체입니다. ${buildVisitPlain(item)} 블로그 글이 있더라도 요금, 대기, 장비 상태는 달라질 수 있으니 현장 안내판과 네이버 지도 최신 정보를 같이 확인하는 편이 좋습니다.`,
    conclusionSection: `${area}에서 ${withObject(item.washType || '세차')} 찾고 있다면 ${nameSubject} 후기와 위치를 함께 살펴볼 만한 후보입니다. 같은 지역의 세차장과 요금, 운영시간, 세차 방식, 대기 가능성을 비교해 보세요.`,
  };
}

function isIncheonSeogu(item) {
  return item.cityLabel === '인천' && item.district === '서구';
}

function isPrioritySeoguCarwash(item, sourceCount) {
  const text = `${item.name} ${item.dong || ''} ${item.querySignals?.join(' ') || ''}`;
  return (
    sourceCount >= 6 ||
    /킹콩샤워|컴인워시|워시보이|워시멜로우|오토스테이|올댓워시|더블유카워시|웰컴워시|청라|검단|루원|가좌|불로/i.test(text) ||
    Number(item.rankScore || 0) >= 96
  );
}

function buildTopicHints(text) {
  const normalized = String(text || '');
  const hits = [];
  if (/실내|게러지|가라지|워시보이|킹콩샤워/i.test(normalized)) hits.push('실내 세차 공간');
  if (/노터치|노브러쉬|컴인워시|오토스테이|올댓워시|자동세차/i.test(normalized)) hits.push('노터치 또는 자동세차 방식');
  if (/24시|24시간|연중무휴|야간/i.test(normalized)) hits.push('늦은 시간 이용');
  if (/하부|언더/i.test(normalized)) hits.push('하부세차 확인');
  if (/진공|매트|드라잉|에어건/i.test(normalized)) hits.push('실내 청소와 드라잉 공간');
  if (/손세차|디테일|광택|유리막|스팀|실내크리닝/i.test(normalized)) hits.push('손세차와 디테일링 작업');
  if (/가격|요금|가성비|쿠폰/i.test(normalized)) hits.push('요금과 코스 구성');
  const unique = [...new Set(hits)];
  return {
    summary: unique.length ? unique.slice(0, 3).join(', ') : '위치와 세차 방식',
    facility: unique.length
      ? `${unique.slice(0, 2).join(', ')}에 대한 언급이 있어 방문 전 확인 포인트로 삼기 좋습니다.`
      : '지도 사진에서 세차 공간과 장비 구성을 먼저 보는 것이 좋습니다.',
  };
}

function buildEnhancedPositivePoints(topic, isIndoor, isNoTouch) {
  const points = [];
  if (isIndoor) points.push('실내형 세차 공간이나 넓은 베이를 장점으로 본 글이 있습니다.');
  if (isNoTouch) points.push('노터치 또는 자동세차 방식에 관심 있는 이용자 후기가 보입니다.');
  points.push(`${topic.summary}을 언급한 블로그 글이 확인됩니다.`);
  points.push('사진이 포함된 글을 보면 세차 공간과 장비 구성을 미리 살펴보기 좋습니다.');
  return [...new Set(points)].slice(0, 4);
}

function buildEnhancedCautionPoints(isIndoor, isNoTouch) {
  const points = [];
  points.push('운영시간과 요금은 네이버 지도 또는 현장 안내판 기준으로 다시 확인해 주세요.');
  if (isIndoor) points.push('실내 베이 대기나 드라잉 공간 혼잡도는 방문 시간대에 따라 달라질 수 있습니다.');
  if (isNoTouch) points.push('노터치 코스, 하부세차 포함 여부, 건조 구간은 선택 코스에 따라 달라질 수 있습니다.');
  points.push('블로그 후기는 작성 시점이 다르므로 최신 사진과 업체 안내를 함께 보는 것이 좋습니다.');
  return points;
}

function buildPlainCautions(item, topicHints) {
  return [
    buildHoursPlain(item),
    buildPricePlain(item),
    `${topicHints.summary} 관련 정보는 네이버 지도 사진과 업체 안내를 함께 확인해 주세요.`,
  ];
}

function knownPhone(phone) {
  return phone && !/정보 없음|\?뺣낫/.test(String(phone));
}

function buildHoursPlain(item) {
  const weekday = String(item.weekdayHours || '');
  const holiday = String(item.holidayHours || '');
  if (weekday && !/정보 없음|\?뺣낫/.test(weekday)) {
    return `운영시간은 평일 ${weekday}${holiday && !/정보 없음|\?뺣낫/.test(holiday) ? `, 휴일 ${holiday}` : ''} 기준으로 정리했습니다.`;
  }
  return '운영시간은 네이버 지도 영업 상태나 업체 안내를 기준으로 확인하는 것이 좋습니다.';
}

function buildPricePlain(item) {
  const fee = String(item.feeInfo || '');
  if (fee && !/요금 정보 없음|정보 없음|\?붽툑|\?뺣낫/.test(fee)) return `요금은 ${fee}로 정리되어 있습니다.`;
  return '요금은 코스와 옵션에 따라 달라질 수 있어 최신 가격표를 확인하는 편이 좋습니다.';
}

function buildVisitPlain(item) {
  const text = `${item.name} ${item.category} ${item.washType} ${item.serviceLabels?.join(' ') || ''}`;
  if (/노터치|노브러쉬|컴인워시|오토스테이|자동세차/i.test(text)) return '자동세차를 이용할 계획이라면 코스표, 하부세차 포함 여부, 건조 구간을 먼저 살펴보세요.';
  if (/손세차|디테일|광택|유리막|스팀|실내크리닝/i.test(text)) return '손세차나 디테일링 작업은 포함 범위와 예약 가능 여부를 먼저 확인하는 것이 좋습니다.';
  return '셀프세차를 이용할 계획이라면 세차 베이, 드라잉 공간, 진공청소기와 매트 세척기 위치를 함께 확인해 보세요.';
}

function mergeExternalItems(baseItems, externalItems, options = {}) {
  const merged = [...baseItems];
  for (const external of externalItems) {
    const duplicateIndex = merged.findIndex((item) => isLikelyDuplicate(item, external));
    if (duplicateIndex >= 0) {
      merged[duplicateIndex] = mergeDuplicateDetails(merged[duplicateIndex], external);
    } else if (options.appendExternal !== false) {
      merged.push(external);
    }
  }
  return merged;
}

function mergeDuplicateDetails(primary, secondary) {
  return {
    ...primary,
    lat: primary.lat || secondary.lat || 0,
    lng: primary.lng || secondary.lng || 0,
    permitNo: primary.permitNo || secondary.permitNo || '',
    dataBaseDate: primary.dataBaseDate || secondary.dataBaseDate || '',
    dataUpdatedAt: primary.dataUpdatedAt || secondary.dataUpdatedAt || '',
    weekdayHours: preferKnown(primary.weekdayHours, secondary.weekdayHours),
    holidayHours: preferKnown(primary.holidayHours, secondary.holidayHours),
    feeInfo: preferKnown(primary.feeInfo, secondary.feeInfo),
    phone: preferKnown(primary.phone, secondary.phone),
    serviceLabels: uniqueList([...(primary.serviceLabels || []), ...(secondary.serviceLabels || [])]),
    flags: mergeFlags(primary.flags, secondary.flags),
    publicDataSourceId: secondary.source === 'public-data' ? secondary.sourceId : primary.publicDataSourceId,
  };
}

function mergeFlags(a = {}, b = {}) {
  return {
    ...a,
    selfWash: Boolean(a.selfWash || b.selfWash),
    automaticWash: Boolean(a.automaticWash || b.automaticWash),
    handWash: Boolean(a.handWash || b.handWash),
    gasStation: Boolean(a.gasStation || b.gasStation),
    lowerWash: Boolean(a.lowerWash || b.lowerWash),
    priceKnown: Boolean(a.priceKnown || b.priceKnown),
    phoneKnown: Boolean(a.phoneKnown || b.phoneKnown),
    hoursKnown: Boolean(a.hoursKnown || b.hoursKnown),
  };
}

function preferKnown(primary, secondary) {
  if (primary && !/정보 없음|요금 정보 없음/.test(String(primary))) return primary;
  return secondary || primary;
}

function applyRankingMetadata(item) {
  return {
    ...item,
    rankScore: scoreCarwash(item),
    dataPriority: item.source === 'naver-local' ? 'naver-first' : 'public-supplement',
  };
}

function compareCarwashes(a, b) {
  return (
    cityOrder(a.cityLabel) - cityOrder(b.cityLabel) ||
    b.rankScore - a.rankScore ||
    (b.sourceCount || 0) - (a.sourceCount || 0) ||
    a.district.localeCompare(b.district, 'ko') ||
    a.name.localeCompare(b.name, 'ko')
  );
}

function scoreCarwash(item) {
  let score = item.source === 'naver-local' ? 80 : 25;
  const text = `${item.name} ${item.category} ${item.washType} ${(item.serviceLabels || []).join(' ')} ${(item.querySignals || []).join(' ')}`;
  if (item.hasReviews) score += 28;
  score += Math.min(item.sourceCount || 0, 8) * 3;
  if (item.phone && item.phone !== '정보 없음') score += 4;
  if (item.weekdayHours && item.weekdayHours !== '정보 없음') score += 3;
  if (item.feeInfo && item.feeInfo !== '요금 정보 없음') score += 3;
  if (item.flags?.selfWash) score += 6;
  if (item.flags?.automaticWash) score += 4;
  if (item.flags?.handWash) score += 4;
  if (/킹콩샤워|워시멜로우|컴인워시|오토스테이|워시존|워시블랑|세차플랜|wash|워시/i.test(text)) score += 10;
  if (/24시간|24시|노터치|노브러시|하부세차|무료진공|진공청소|실내셀프/.test(text)) score += 6;
  return score;
}

function isLikelyDuplicate(a, b) {
  if (a.cityLabel !== b.cityLabel) return false;
  const aAddress = normalizeCompare(a.roadAddress || a.lotAddress);
  const bAddress = normalizeCompare(b.roadAddress || b.lotAddress);
  const aName = normalizeCompare(a.name);
  const bName = normalizeCompare(b.name);
  if (aAddress && bAddress && aAddress === bAddress) return true;
  if (aAddress && bAddress && (aAddress.includes(bAddress) || bAddress.includes(aAddress))) return nameSimilarity(aName, bName) >= 0.45;
  return aName === bName && clean(a.district) === clean(b.district) && clean(a.dong) === clean(b.dong);
}

function nameSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 1;
  const aChars = new Set([...a]);
  const bChars = new Set([...b]);
  const intersection = [...aChars].filter((char) => bChars.has(char)).length;
  return intersection / Math.max(aChars.size, bChars.size);
}

function buildGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const config = CITY_CONFIGS[item.cityLabel];
    const districtName = `${item.cityLabel} ${item.district}`;
    addGroup(groups, {
      type: 'city',
      name: `${item.cityLabel} 세차장`,
      title: buildAreaSeoTitle({ label: item.cityLabel, scope: 'city' }),
      slug: `${config.slug}-carwash`,
      description: buildAreaSeoDescription({ label: item.cityLabel, count: cityItemsCount(items, item.cityLabel), scope: 'city' }),
      item,
    });
    addGroup(groups, {
      type: 'district',
      name: `${districtName} 세차장`,
      title: buildAreaSeoTitle({ label: districtName }),
      slug: slugify(`${config.slug}-${districtSlug(item.district)}-carwash`),
      description: buildAreaSeoDescription({ label: districtName, count: districtItemsCount(items, item.cityLabel, item.district) }),
      item,
    });
    for (const intent of inferAreaTypeIntents(item)) {
      addGroup(groups, {
        type: 'districtType',
        name: `${districtName} ${intent.name}`,
        title: buildAreaSeoTitle({ label: districtName, type: intent.name }),
        slug: slugify(`${config.slug}-${districtSlug(item.district)}-${intent.slug}`),
        description: buildAreaSeoDescription({ label: districtName, type: intent.name }),
        intent,
        item,
      });
    }
    if (item.dong) {
      addGroup(groups, {
        type: 'dong',
        name: `${item.cityLabel} ${item.district} ${item.dong} 세차장`,
        title: buildAreaSeoTitle({ label: `${item.cityLabel} ${item.district} ${item.dong}` }),
        slug: slugify(`${config.slug}-${districtSlug(item.district)}-${item.dong}-carwash`),
        description: buildAreaSeoDescription({ label: `${item.cityLabel} ${item.district} ${item.dong}` }),
        item,
      });
      for (const intent of inferAreaTypeIntents(item)) {
        addGroup(groups, {
          type: 'dongType',
          name: `${item.cityLabel} ${item.district} ${item.dong} ${intent.name}`,
          title: buildAreaSeoTitle({ label: `${item.cityLabel} ${item.district} ${item.dong}`, type: intent.name }),
          slug: slugify(`${config.slug}-${districtSlug(item.district)}-${item.dong}-${intent.slug}`),
          description: buildAreaSeoDescription({ label: `${item.cityLabel} ${item.district} ${item.dong}`, type: intent.name }),
          intent,
          item,
        });
      }
    }
    for (const place of inferPlaceTags(item, config)) {
      addGroup(groups, {
        type: 'place',
        name: `${item.cityLabel} ${place} 근처 세차장`,
        title: buildAreaSeoTitle({ label: `${item.cityLabel} ${place} 근처` }),
        slug: slugify(`${config.slug}-${place}-near-carwash`),
        description: buildAreaSeoDescription({ label: `${item.cityLabel} ${place} 근처` }),
        item,
      });
      for (const intent of inferPlaceTypeIntents(item)) {
        addGroup(groups, {
          type: 'placeType',
          name: `${item.cityLabel} ${place} ${intent.name}`,
          title: buildAreaSeoTitle({ label: `${item.cityLabel} ${place}`, type: intent.name }),
          slug: slugify(`${config.slug}-${place}-${intent.slug}`),
          description: buildAreaSeoDescription({ label: `${item.cityLabel} ${place}`, type: intent.name }),
          intent,
          item,
        });
      }
    }
  }
  addPriorityKeywordGroups(groups, items);
  return [...groups.values()]
    .filter((group) => {
      if (['city', 'district'].includes(group.type)) return true;
      if (group.type === 'districtType') return group.items.length >= 3;
      if (group.type === 'priorityKeyword') return group.items.length >= 1;
      if (group.type === 'dong') return group.items.length >= 2;
      if (['place', 'placeType', 'dongType'].includes(group.type)) return false;
      return group.items.length >= 2;
    })
    .sort((a, b) => {
      const order = { city: 0, district: 1, districtType: 2, priorityKeyword: 3, dong: 4 };
      return (order[a.type] ?? 9) - (order[b.type] ?? 9) || cityOrderFromSlug(a.slug) - cityOrderFromSlug(b.slug) || b.items.length - a.items.length || a.name.localeCompare(b.name, 'ko');
    });
}

function addPriorityKeywordGroups(groups, items) {
  const definitions = [
    ['ulsan-wolpyeongro-nobrush-carwash', '울산 월평로 노브러쉬세차', '울산 월평로 노브러쉬세차 위치, 요금, 후기 모음', '울산 월평로 주변에서 노브러쉬 또는 노터치 방식으로 확인되는 세차장을 따로 정리했습니다.', (item) => hasAll(item, ['울산', '월평로']) && hasAny(item, ['노브러쉬', '노브러시', '노터치'])],
    ['seoul-hongje-station-self-carwash', '홍제역 부근 셀프세차장', '홍제역 부근 셀프세차장 위치, 요금, 후기 모음', '홍제역 주변에서 셀프세차장 검색 의도에 맞는 업체를 모아 비교합니다.', (item) => hasAny(item, ['홍제역', '홍제']) && hasAny(item, ['셀프세차', '셀프'])],
    ['busan-jeonggwan-nobrush-carwash', '정관 노터치 세차', '정관 노터치 세차 위치, 요금, 후기 모음', '부산 정관 주변에서 노터치 또는 자동세차로 살펴볼 만한 세차장을 정리했습니다.', (item) => hasAll(item, ['부산']) && hasAny(item, ['정관'])],
    ['busan-gaegeum-nobrush-carwash', '개금 노터치세차', '개금 노터치세차 위치, 요금, 후기 모음', '부산 개금 주변에서 노터치 또는 자동세차 검색 의도에 맞는 세차장을 모았습니다.', (item) => hasAny(item, ['개금']) && hasAny(item, ['노터치', '노브러쉬', '노브러시', '자동세차'])],
    ['gwangju-sangmu-district-nobrush-carwash', '상무지구 노터치 세차', '상무지구 노터치 세차 위치, 요금, 후기 모음', '광주 상무지구 주변에서 노터치 또는 노브러쉬 세차장을 찾는 분들을 위해 정리했습니다.', (item) => hasAny(item, ['상무지구', '상무']) && hasAny(item, ['노터치', '노브러쉬', '노브러시', '자동세차'])],
    ['incheon-yeongjongdo-nobrush-auto-carwash', '영종도 노터치 자동세차', '영종도 노터치 자동세차 위치, 요금, 후기 모음', '영종도와 인천공항 주변에서 노터치 자동세차로 확인되는 곳을 따로 모았습니다.', (item) => hasAny(item, ['영종도', '영종', '운서', '인천공항']) && hasAny(item, ['노터치', '노브러쉬', '노브러시', '자동세차'])],
    ['chungbuk-osong-carwash-location', '오송세차장 위치', '오송세차장 위치, 요금, 후기 모음', '오송 주변 세차장 위치와 세차 방식, 후기 여부를 한 번에 비교할 수 있게 정리했습니다.', (item) => hasAny(item, ['오송'])],
    ['chungbuk-osong-underbody-detailing-carwash', '오송 하부디테일링 세차', '오송 하부디테일링 세차 위치, 요금, 후기 모음', '오송 주변에서 하부세차, 디테일링, 실내세차를 함께 확인하려는 검색 의도에 맞춰 정리했습니다.', (item) => hasAny(item, ['오송']) && hasAny(item, ['하부', '디테일', '실내', '내부', '에바크리닝'])],
    ['chungbuk-seochungju-bogeulbogeul-wash', '서충주 보글보글워시세차장', '서충주 보글보글워시세차장 위치, 요금, 후기', '서충주 보글보글워시세차장의 위치와 주변 세차장 비교 정보를 함께 정리했습니다.', (item) => hasAny(item, ['보글보글워시', '보글보글워시세차장', '서충주'])],
    ['gyeonggi-joam-nobrush-carwash', '조암 노터치세차장', '조암 노터치세차장 위치, 요금, 후기 모음', '조암 주변에서 노터치 또는 자동세차를 찾는 검색 의도에 맞춰 관련 세차장을 정리했습니다.', (item) => hasAny(item, ['조암']) && hasAny(item, ['노터치', '노브러쉬', '노브러시', '자동세차'])],
    ['daejeon-sintanjin-self-carwash-garage', '신탄진 셀프세차장 개러지', '신탄진 셀프세차장 개러지 위치, 요금, 후기 모음', '신탄진 주변에서 셀프세차장이나 개러지형 세차장을 찾을 때 비교할 만한 곳을 정리했습니다.', (item) => hasAny(item, ['신탄진']) && hasAny(item, ['셀프', '개러지', '게러지'])],
    ['busan-gwangalli-sk-enclean-carwash', '광안리 SK엔크린 세차', '광안리 SK엔크린 세차 위치, 요금, 후기', '광안리 주변 SK엔크린 주유소 세차장과 근처 세차장을 함께 확인할 수 있게 정리했습니다.', (item) => hasAny(item, ['광안리', '광남로', '민락동']) && hasAny(item, ['SK엔크린', '주유소', '세차'])],
    ['ulsan-yugok-autokazi-carwash', '울산 유곡동 오토카지', '울산 유곡동 오토카지 위치, 요금, 후기', '울산 유곡동 오토카지와 주변 실내세차, 손세차 업체를 함께 비교할 수 있게 정리했습니다.', (item) => hasAny(item, ['유곡동', '오토카지'])],
    ['gangwon-wonju-ic-wiper-garage', '와이퍼 개러지 원주 IC', '와이퍼 개러지 원주 IC 위치, 요금, 후기', '원주 IC 주변 와이퍼 개러지와 근처 세차장 정보를 함께 정리했습니다.', (item) => hasAny(item, ['와이퍼', '원주IC', '원주 IC', '원주']) && hasAny(item, ['개러지', '게러지', '와이퍼'])],
    ['seoul-jangstar-interior-carwash', '장스타 실내 내부세차', '장스타 실내 내부세차 위치, 요금, 후기 모음', '장스타 실내 내부세차, 에바크리닝 관련 업체를 지역별로 비교할 수 있게 정리했습니다.', (item) => hasAny(item, ['장스타']) && hasAny(item, ['실내', '내부', '에바크리닝'])],
  ];

  for (const [slug, name, title, description, predicate] of definitions) {
    const matched = items.filter(predicate).slice(0, 30);
    for (const item of matched) {
      addGroup(groups, {
        type: 'priorityKeyword',
        name,
        title,
        slug,
        description,
        intent: {
          slug: 'priority-keyword',
          guide: `${name} 검색어는 실제 유입이 확인된 표현입니다. 업체명, 위치, 세차 방식, 후기 여부를 함께 보고 방문 전 최신 운영 정보를 확인해 주세요.`,
        },
        item,
      });
    }
  }
}

function hasAny(item, needles) {
  const text = normalizeCompareText(item);
  return needles.some((needle) => text.includes(normalizeCompareTextValue(needle)));
}

function hasAll(item, needles) {
  const text = normalizeCompareText(item);
  return needles.every((needle) => text.includes(normalizeCompareTextValue(needle)));
}

function normalizeCompareText(item) {
  return normalizeCompareTextValue(`${item.cityLabel} ${item.district} ${item.dong} ${item.areaLabel} ${item.name} ${item.title} ${item.category} ${item.washType} ${item.roadAddress} ${item.lotAddress} ${(item.serviceLabels || []).join(' ')} ${(item.querySignals || []).join(' ')}`);
}

function normalizeCompareTextValue(value) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function isPrioritySearchGroup(group) {
  const text = `${group.name} ${group.title} ${group.description}`;
  return /월평로|영종도|오송|정관|상무|송도|검단|청라|홍제|괘법|대천|강남|강동|동대문|구로|금천|도봉|노원|광진|울산|노터치|노브러시|노브러쉬|하부세차|실내세차|내부세차/.test(text);
}

function inferAreaTypeIntents(item) {
  const text = normalizeSearchText(item);
  const intents = [];
  if (item.flags?.selfWash || /셀프|고압|폼건|세차베이|버블|개러지/.test(text)) {
    intents.push({
      slug: 'self-carwash',
      name: '셀프세차장',
      guide: '세차 베이, 고압수, 폼건, 진공청소기 공간을 함께 비교하면 좋습니다.',
    });
  }
  if (item.flags?.automaticWash || /자동|기계식|노터치|노브러시|노브러쉬|터널식|주유소|충전소/.test(text)) {
    intents.push({
      slug: 'auto-carwash',
      name: '자동세차장',
      guide: '자동세차는 코스별 요금, 하부세차 포함 여부, 건조 방식이 매장마다 다를 수 있습니다.',
    });
  }
  if (/노터치|노브러시|노브러쉬|터치리스/.test(text)) {
    intents.push({
      slug: 'nobrush-carwash',
      name: '노터치·노브러쉬 세차장',
      guide: '노터치·노브러쉬 세차는 브러시 접촉이 적은 방식인지, 예비세척과 건조 코스가 어떻게 운영되는지 확인해 보세요.',
    });
  }
  if (item.flags?.handWash || /손세차|스팀|광택|디테일|디테일링|실내크리닝|실내세차|내부세차|에바크리닝/.test(text)) {
    intents.push({
      slug: 'hand-carwash',
      name: '손세차장',
      guide: '손세차와 디테일링 업체는 예약 가능 여부, 작업 시간, 실내크리닝 범위를 먼저 보는 편이 좋습니다.',
    });
  }
  if (/실내세차|내부세차|실내크리닝|에바크리닝/.test(text)) {
    intents.push({
      slug: 'interior-carwash',
      name: '실내세차',
      guide: '실내세차는 시트, 매트, 트렁크, 에바크리닝처럼 포함 범위가 달라질 수 있어 작업 항목 확인이 중요합니다.',
    });
  }
  if (item.flags?.lowerWash || /하부세차|하부/.test(text)) {
    intents.push({
      slug: 'underbody-carwash',
      name: '하부세차장',
      guide: '하부세차는 자동세차 코스에 포함되는지, 별도 옵션인지 매장 안내판을 확인해 보세요.',
    });
  }
  if (/24시간|24시|연중무휴/.test(text)) {
    intents.push({
      slug: '24h-carwash',
      name: '24시간 세차장',
      guide: '24시간으로 보이는 곳도 정비, 청소, 기상 상황에 따라 운영이 바뀔 수 있어 방문 전 최신 영업 상태를 확인하는 편이 좋습니다.',
    });
  }
  return uniqueBy(intents, 'slug');
}

function inferPlaceTypeIntents(item) {
  const text = normalizeSearchText(item);
  return inferAreaTypeIntents(item).filter((intent) => {
    if (['self-carwash', 'auto-carwash', 'nobrush-carwash'].includes(intent.slug)) return true;
    return /손세차|실내세차|내부세차|하부세차|24시간|24시|연중무휴/.test(text);
  });
}

function normalizeSearchText(item) {
  return `${item.name} ${item.category} ${item.washType} ${(item.serviceLabels || []).join(' ')} ${(item.querySignals || []).join(' ')} ${(item.sourceRefs || []).map((source) => source.title).join(' ')}`;
}

function uniqueBy(items, key) {
  const seen = new Set();
  return items.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function cityItemsCount(items, cityLabel) {
  return items.filter((item) => item.cityLabel === cityLabel).length;
}

function districtItemsCount(items, cityLabel, district) {
  return items.filter((item) => item.cityLabel === cityLabel && item.district === district).length;
}

function buildTypes(items) {
  const definitions = [
    ['self-carwash', '셀프세차장', '셀프세차장 추천 비교: 위치, 요금, 후기', '전국 셀프세차장 후보를 지도 위치, 운영시간, 요금, 후기 여부 기준으로 비교할 수 있게 정리했습니다.', (item) => item.flags.selfWash],
    ['auto-carwash', '자동세차장', '자동세차장 추천 비교: 노터치, 주유소, 후기', '자동세차, 노터치세차, 주유소 부속 세차장 정보를 함께 비교할 수 있게 정리했습니다.', (item) => item.flags.automaticWash],
    ['hand-carwash', '손세차장', '손세차장 추천 비교: 실내세차, 광택, 후기', '손세차, 실내세차, 광택, 디테일링 성격의 업체를 지역별로 확인할 수 있게 정리했습니다.', (item) => item.flags.handWash],
    ['gas-station-carwash', '주유소 세차장', '주유소 세차장 추천 비교: 자동세차, 위치, 후기', '주유 동선과 함께 이용하기 좋은 주유소 부속 세차장 정보를 모았습니다.', (item) => item.flags.gasStation],
    ['24h-carwash', '24시간 세차장', '24시간 세차장 추천 비교: 야간, 위치, 후기', '24시간 또는 연중무휴로 검색되는 세차장을 모았습니다. 실제 운영 여부는 방문 전 확인해 주세요.', (item) => /24시간|24시|연중무휴/.test(`${item.name} ${(item.serviceLabels || []).join(' ')} ${(item.querySignals || []).join(' ')}`)],
    ['price-known-carwash', '요금 확인 세차장', '세차장 요금 확인 가능한 곳 비교', '공개 데이터나 검색 결과에서 요금 단서가 확인되는 세차장을 우선 정리했습니다.', (item) => item.feeInfo !== '요금 정보 없음'],
  ];

  return definitions
    .map(([slug, name, title, description, predicate]) => ({
      slug,
      name,
      title,
      description,
      items: items.filter(predicate).map(toListItem),
    }))
    .filter((group) => group.items.length > 0);
}

function addGroup(groups, config) {
  const group = groups.get(config.slug) || {
    type: config.type,
    name: config.name,
    title: config.title,
    slug: config.slug,
    description: config.description,
    intent: config.intent || null,
    items: [],
  };
  if (!group.items.some((item) => item.slug === config.item.slug)) group.items.push(toListItem(config.item));
  groups.set(config.slug, group);
}

function toListItem(item) {
  return {
    slug: item.slug,
    name: item.name,
    cityLabel: item.cityLabel,
    district: item.district,
    dong: item.dong,
    areaLabel: item.areaLabel,
    category: item.category,
    washType: item.washType,
    roadAddress: item.roadAddress,
    lotAddress: item.lotAddress,
    weekdayHours: item.weekdayHours,
    feeInfo: item.feeInfo,
    phone: item.phone,
    lat: item.lat,
    lng: item.lng,
    mapx: item.mapx,
    mapy: item.mapy,
    naverMapUrl: item.naverMapUrl,
    serviceLabels: item.serviceLabels,
    source: item.source || 'public-data',
    dataPriority: item.dataPriority,
    rankScore: item.rankScore,
    hasReviews: Boolean(item.hasReviews),
    sourceCount: item.sourceCount || 0,
  };
}

function inferFlagsFromText(value, extra = {}) {
  const text = String(value || '').toLowerCase();
  return {
    selfWash: /셀프|self|고압|폼건|버블|세차베이|개러지/.test(text),
    automaticWash: /자동|노터치|노브러시|주유소|충전소/.test(text),
    handWash: /손세차|스팀|광택|디테일|디테일링|실내크리닝|detail/.test(text),
    gasStation: /주유소|충전소|lpg/.test(text),
    lowerWash: /하부/.test(text),
    ...extra,
  };
}

function looksLikeCarwashItem(item) {
  const name = String(item.name || '');
  const category = String(item.category || '');
  const address = `${item.roadAddress || ''} ${item.lotAddress || ''}`;
  const text = `${name} ${category} ${address} ${(item.querySignals || []).join(' ')}`;
  if (/입구|출장|출장정비|대리|렌트카|오피스텔|아파트|경매|용품만|빨래방|붙임머리|가발|외국인학교|청소차고지|폐차|방수|누수|에폭시|옥상|외벽|수리,AS|컴퓨터|노트북|데이터복구|부동산|중개업|오토바이|바이크|투\s*휠|타이어,휠|무료 셀프서비스|요새|운영 종료/i.test(text)) return false;
  const categoryLooksLikeCarwash = /세차|스팀세차|셀프세차/i.test(category);
  const nameLooksLikeCarwash = /세차|셀프|자동|노터치|노브러시|광택|디테일|카워시|wash|워시|킹콩샤워|컴인워시|오토스테이/i.test(name);
  return categoryLooksLikeCarwash || nameLooksLikeCarwash;
}

function buildServiceLabels(flags, fallbackLabel) {
  const labels = [];
  if (flags.selfWash) labels.push('셀프세차');
  if (flags.automaticWash) labels.push('자동세차');
  if (flags.handWash) labels.push('손세차');
  if (flags.gasStation) labels.push('주유소 부속');
  if (flags.lowerWash) labels.push('하부세차 확인 필요');
  if (flags.priceKnown) labels.push('요금 등록');
  if (flags.phoneKnown) labels.push('전화 확인 가능');
  if (flags.hoursKnown) labels.push('운영시간 확인 필요');
  if (!labels.length) labels.push(clean(fallbackLabel) || '세차');
  return labels;
}

function buildFacilitySection(flags, fallbackLabel) {
  const labels = buildServiceLabels(flags, fallbackLabel).join(', ');
  if (flags.selfWash) return `셀프세차로 살펴볼 만한 곳입니다. 세차 베이, 고압수, 폼건, 진공청소기 위치는 매장마다 다르므로 최근 사진을 같이 보면 좋습니다. 현재 확인된 항목은 ${labels}입니다.`;
  if (flags.automaticWash) return `자동세차 또는 노터치세차 쪽으로 확인되는 곳입니다. 코스별 요금, 하부세차 포함 여부, 건조 구간은 매장 안내판을 기준으로 보는 편이 좋습니다. 현재 확인된 항목은 ${labels}입니다.`;
  if (flags.handWash) return `손세차나 디테일링 성격이 있는 곳입니다. 예약 여부, 작업 시간, 실내크리닝 가능 범위에 따라 이용 방식이 달라질 수 있습니다. 현재 확인된 항목은 ${labels}입니다.`;
  return `현재 확인된 항목은 ${labels}입니다. 진공청소기, 매트세척기, 하부세차, 카드결제 가능 여부는 최신 지도 사진에서 함께 살펴보세요.`;
}

function buildFieldCheckSection(item) {
  const address = item.roadAddress || item.lotAddress || '정보 없음';
  const phone = item.phone ? `전화번호는 ${item.phone}입니다.` : '전화번호가 따로 보이지 않으면 네이버 지도 상세 화면에서 문의 방법을 확인해 주세요.';
  const hours = item.weekdayHours && item.weekdayHours !== '정보 없음' ? `운영시간은 ${item.weekdayHours} 기준으로 정리했습니다.` : '운영시간은 네이버 지도 영업 상태와 업체 안내를 기준으로 확인하는 편이 좋습니다.';
  const price = item.feeInfo ? `요금 정보는 ${item.feeInfo}로 확인됩니다.` : '요금은 현장 안내판이나 최신 지도 사진에서 확인하는 것이 가장 정확합니다.';
  return `${item.name}의 지도상 주소는 ${address}입니다. ${phone} ${hours} ${price} 최근 사진에 세차 베이, 진공청소기 구역, 결제 안내판이 보이면 실제 이용 동선을 가늠하기 좋습니다.`;
}

function buildCautionPoints(flags) {
  const points = [
    '운영시간: 네이버 지도 영업 상태와 업체 안내를 기준으로 한 번 더 확인해 주세요.',
    '요금: 기본요금, 시간 추가, 카드결제 가능 여부는 최신 사진이나 업체 안내를 확인해 주세요.',
  ];
  if (flags.selfWash) points.push('시설: 세차 베이 대기, 진공청소기 위치, 세차용품 자판기 여부를 함께 확인하면 좋습니다.');
  if (flags.automaticWash) points.push('시설: 하부세차 포함 여부와 코스별 금액은 현장 안내와 다를 수 있습니다.');
  if (flags.handWash) points.push('예약: 손세차와 디테일링은 작업 시간이 길 수 있어 예약 가능 여부를 확인하는 편이 좋습니다.');
  return points;
}

function inferCityLabel(value) {
  const text = String(value || '');
  for (const [label, config] of Object.entries(CITY_CONFIGS)) {
    if ((config.aliases || [config.fullName]).some((alias) => text.includes(alias))) return label;
  }
  return '';
}

function inferDistrict(address, config) {
  const text = String(address || '');
  return [...(config?.districts || [])]
    .sort((a, b) => b.length - a.length)
    .find((district) => text.includes(district)) || '';
}

function preferInferredDistrict(rawDistrict, inferredDistrict) {
  if (!rawDistrict) return inferredDistrict || '';
  if (!inferredDistrict) return rawDistrict;
  if (inferredDistrict !== rawDistrict && inferredDistrict.includes(rawDistrict)) return inferredDistrict;
  return rawDistrict;
}

function normalizeIncheonDistrict({ cityLabel, district, dong, addressText }) {
  if (cityLabel !== '인천') return district;
  const text = `${district || ''} ${dong || ''} ${addressText || ''}`;
  const stableDistrict = inferStableIncheonDistrict(text);
  if (stableDistrict) return stableDistrict;
  if (text.includes('검단구')) return '검단구';
  if (text.includes('서해구')) return '서해구';
  if (text.includes('영종구')) return '영종구';
  if (text.includes('제물포구')) return '제물포구';

  if (district === '서구') {
    if (isIncheonGeomdanArea(text)) return '검단구';
    return '서해구';
  }
  if (district === '중구') {
    if (isIncheonYeongjongArea(text)) return '영종구';
    return '제물포구';
  }
  if (district === '동구') return '제물포구';
  return district;
}

function inferStableIncheonDistrict(text) {
  return ['미추홀구', '연수구', '남동구', '부평구', '계양구', '강화군', '옹진군'].find((district) => String(text || '').includes(district)) || '';
}

function shouldPreferInferredDong(rawDong, district, inferredDong) {
  if (!rawDong || !inferredDong) return false;
  return (
    (district === '남동구' && rawDong === '남동') ||
    (district === '미추홀구' && rawDong === '미추홀') ||
    (district === '연수구' && rawDong === '연수') ||
    (district === '부평구' && rawDong === '부평') ||
    (district === '계양구' && rawDong === '계양')
  );
}

function isIncheonGeomdanArea(text) {
  return /검단|불로|대곡|원당|당하|오류|왕길|마전|아라|백석|시천/.test(String(text || ''));
}

function isIncheonYeongjongArea(text) {
  return /영종|운서|운남|운북|중산|용유|을왕|덕교|남북|무의|인천공항|공항/.test(String(text || ''));
}

function inferDong(address, config) {
  const districtPattern = new RegExp((config?.districts || []).join('|'), 'g');
  const cityPattern = new RegExp((config?.aliases || [config?.fullName]).filter(Boolean).join('|'), 'g');
  const cleaned = String(address || '').replace(cityPattern, ' ').replace(config?.slug || '', ' ').replace(districtPattern, ' ');
  const match = cleaned.match(/([가-힣0-9]+(?:동|읍|면|리))(?:\s|$)/);
  return match?.[1] || '';
}

function inferPlaceTags(item, config) {
  const text = `${item.name} ${item.roadAddress} ${item.lotAddress} ${item.dong} ${(item.querySignals || []).join(' ')}`;
  const tags = config.places.filter((place) => text.includes(place));
  for (const signal of item.querySignals || []) {
    const location = extractSearchLocation(signal);
    if (location) tags.push(location);
  }
  const roadName = String(item.roadAddress || item.lotAddress || '').match(/([가-힣0-9]+(?:로|길))(?:\s|\d|-)/)?.[1];
  if (roadName && roadName.length >= 3 && !/번길$/.test(roadName)) tags.push(roadName);
  return [...new Set(tags)].filter((tag) => tag && tag.length >= 2).slice(0, 6);
}

function extractSearchLocation(signal) {
  let value = String(signal || '')
    .replace(/(?:세차장|셀프세차장|자동세차장|손세차장|노터치세차|노브러쉬세차|노브러시세차|하부세차|실내세차|내부세차|세차)$/g, '')
    .trim();
  value = value
    .replace(/\b(?:부근|근처|위치)\b/g, ' ')
    .replace(/^(서울|인천|경기|부산|대구|대전|광주|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주)\s+/g, '')
    .replace(/^[가-힣]+(?:시|군|구)\s+/g, '')
    .trim();
  const parts = value.split(/\s+/).filter(Boolean);
  const location = parts.at(-1) || '';
  if (!location || /^(세차|셀프|자동|손세차|노터치|노브러쉬|노브러시|하부|실내|내부|부근|근처|위치)$/.test(location)) return '';
  return location;
}

function buildAreaLabel(cityLabel, district, dong = '') {
  return [cityLabel, district, dong].filter(Boolean).join(' ');
}

function carwashDistrictSlug(cityLabel, district) {
  if (cityLabel === '인천' && ['서해구', '검단구'].includes(district)) return 'seogu';
  return districtSlug(district);
}

function districtSlug(district) {
  const base = {
      "중구": "junggu",
      "서구": "seogu",
      "서해구": "seogu",
      "검단구": "geomdangu",
      "제물포구": "jemulpogu",
      "동구": "donggu",
      "남구": "namgu",
      "북구": "bukgu",
      "미추홀구": "michuholgu",
      "연수구": "yeonsugu",
      "남동구": "namdonggu",
      "부평구": "bupyeonggu",
      "계양구": "gyeyanggu",
      "강화군": "ganghwagun",
      "옹진군": "ongjingun",
      "영종구": "yeongjonggu",
      "종로구": "jongnogu",
      "용산구": "yongsangu",
      "성동구": "seongdonggu",
      "광진구": "gwangjingu",
      "동대문구": "dongdaemungu",
      "중랑구": "jungnanggu",
      "성북구": "seongbukgu",
      "강북구": "gangbukgu",
      "도봉구": "dobonggu",
      "노원구": "nowongu",
      "은평구": "eunpyeonggu",
      "서대문구": "seodaemungu",
      "마포구": "mapogu",
      "양천구": "yangcheongu",
      "강서구": "gangseogu",
      "구로구": "gurogu",
      "금천구": "geumcheongu",
      "영등포구": "yeongdeungpogu",
      "동작구": "dongjakgu",
      "관악구": "gwanakgu",
      "서초구": "seochogu",
      "강남구": "gangnamgu",
      "송파구": "songpagu",
      "강동구": "gangdonggu",
      "수원시": "suwonsi",
      "성남시": "seongnamsi",
      "고양시": "goyangsi",
      "용인시": "yonginsi",
      "부천시": "bucheonsi",
      "화성시": "hwaseongsi",
      "남양주시": "namyangjusi",
      "안산시": "ansansi",
      "안양시": "anyangsi",
      "평택시": "pyeongtaeksi",
      "시흥시": "siheungsi",
      "파주시": "pajusi",
      "의정부시": "uijeongbusi",
      "김포시": "gimposi",
      "광주시": "gwangjusi",
      "광명시": "gwangmyeongsi",
      "군포시": "gunposi",
      "하남시": "hanamsi",
      "오산시": "osansi",
      "양주시": "yangjusi",
      "이천시": "icheonsi",
      "구리시": "gurisi",
      "안성시": "anseongsi",
      "포천시": "pocheonsi",
      "의왕시": "uiwangsi",
      "양평군": "yangpyeonggun",
      "여주시": "yeojusi",
      "동두천시": "dongducheonsi",
      "과천시": "gwacheonsi",
      "가평군": "gapyeonggun",
      "연천군": "yeoncheongun",
      "영도구": "yeongdogu",
      "부산진구": "busanjingu",
      "동래구": "dongnaegu",
      "해운대구": "haeundaegu",
      "사하구": "sahagu",
      "금정구": "geumjeonggu",
      "연제구": "yeonjegu",
      "수영구": "suyeonggu",
      "사상구": "sasanggu",
      "기장군": "gijanggun",
      "수성구": "suseonggu",
      "달서구": "dalseogu",
      "달성군": "dalseonggun",
      "군위군": "gunwigun",
      "유성구": "yuseonggu",
      "대덕구": "daedeokgu",
      "광산구": "gwangsangu",
      "울주군": "uljugun",
      "세종시": "sejongsi",
      "춘천시": "chuncheonsi",
      "원주시": "wonjusi",
      "강릉시": "gangneungsi",
      "동해시": "donghaesi",
      "태백시": "taebaeksi",
      "속초시": "sokchosi",
      "삼척시": "samcheoksi",
      "홍천군": "hongcheongun",
      "횡성군": "hoengseonggun",
      "영월군": "yeongwolgun",
      "평창군": "pyeongchanggun",
      "정선군": "jeongseongun",
      "철원군": "cheorwongun",
      "화천군": "hwacheongun",
      "양구군": "yanggugun",
      "인제군": "injegun",
      "고성군": "goseonggun",
      "양양군": "yangyanggun",
      "청주시": "cheongjusi",
      "충주시": "chungjusi",
      "제천시": "jecheonsi",
      "보은군": "boeungun",
      "옥천군": "okcheongun",
      "영동군": "yeongdonggun",
      "증평군": "jeungpyeonggun",
      "진천군": "jincheongun",
      "괴산군": "goesangun",
      "음성군": "eumseonggun",
      "단양군": "danyanggun",
      "천안시": "cheonansi",
      "공주시": "gongjusi",
      "보령시": "boryeongsi",
      "아산시": "asansi",
      "서산시": "seosansi",
      "논산시": "nonsansi",
      "계룡시": "gyeryongsi",
      "당진시": "dangjinsi",
      "금산군": "geumsangun",
      "부여군": "buyeogun",
      "서천군": "seocheongun",
      "청양군": "cheongyanggun",
      "홍성군": "hongseonggun",
      "예산군": "yesangun",
      "태안군": "taeangun",
      "전주시": "jeonjusi",
      "군산시": "gunsansi",
      "익산시": "iksansi",
      "정읍시": "jeongeupsi",
      "남원시": "namwonsi",
      "김제시": "gimjesi",
      "완주군": "wanjugun",
      "진안군": "jinangun",
      "무주군": "mujugun",
      "장수군": "jangsugun",
      "임실군": "imsilgun",
      "순창군": "sunchanggun",
      "고창군": "gochanggun",
      "부안군": "buangun",
      "목포시": "mokposi",
      "여수시": "yeosusi",
      "순천시": "suncheonsi",
      "나주시": "najusi",
      "광양시": "gwangyangsi",
      "담양군": "damyanggun",
      "곡성군": "gokseonggun",
      "구례군": "guryegun",
      "고흥군": "goheunggun",
      "보성군": "boseonggun",
      "화순군": "hwasungun",
      "장흥군": "jangheunggun",
      "강진군": "gangjingun",
      "해남군": "haenamgun",
      "영암군": "yeongamgun",
      "무안군": "muangun",
      "함평군": "hampyeonggun",
      "영광군": "yeonggwanggun",
      "장성군": "jangseonggun",
      "완도군": "wandogun",
      "진도군": "jindogun",
      "신안군": "sinangun",
      "포항시": "pohangsi",
      "경주시": "gyeongjusi",
      "김천시": "gimcheonsi",
      "안동시": "andongsi",
      "구미시": "gumisi",
      "영주시": "yeongjusi",
      "영천시": "yeongcheonsi",
      "상주시": "sangjusi",
      "문경시": "mungyeongsi",
      "경산시": "gyeongsansi",
      "의성군": "uiseonggun",
      "청송군": "cheongsonggun",
      "영양군": "yeongyanggun",
      "영덕군": "yeongdeokgun",
      "청도군": "cheongdogun",
      "고령군": "goryeonggun",
      "성주군": "seongjugun",
      "칠곡군": "chilgokgun",
      "예천군": "yecheongun",
      "봉화군": "bonghwagun",
      "울진군": "uljingun",
      "울릉군": "ulleunggun",
      "창원시": "changwonsi",
      "진주시": "jinjusi",
      "통영시": "tongyeongsi",
      "사천시": "sacheonsi",
      "김해시": "gimhaesi",
      "밀양시": "miryangsi",
      "거제시": "geojesi",
      "양산시": "yangsansi",
      "의령군": "uiryeonggun",
      "함안군": "hamangun",
      "창녕군": "changnyeonggun",
      "남해군": "namhaegun",
      "하동군": "hadonggun",
      "산청군": "sancheonggun",
      "함양군": "hamyanggun",
      "거창군": "geochanggun",
      "합천군": "hapcheongun",
      "제주시": "jejusi",
      "서귀포시": "seogwiposi"
  };
  return base[district] || slugify(district || 'area');
}

function formatHours(open, close) {
  const start = clean(open);
  const end = clean(close);
  if (!start && !end) return '정보 없음';
  return `${start || '정보 없음'}~${end || '정보 없음'}`;
}

function buildNaverMapUrl(name, address) {
  return `https://map.naver.com/p/search/${encodeURIComponent(`${address} ${name}`.trim())}`;
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

function clean(value) {
  return String(value || '').trim();
}

function normalizeKnownAddressText(value) {
  return clean(value).replace(/전남광주통합특별시/g, '광주광역시');
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeCompare(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣]/g, '');
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function cityOrder(cityLabel) {
  const order = ["인천","서울","경기","부산","대구","대전","광주","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"];
  const index = order.indexOf(cityLabel);
  return index === -1 ? 99 : index;
}

function cityOrderFromSlug(slug) {
  const order = ["incheon","seoul","gyeonggi","busan","daegu","daejeon","gwangju","ulsan","sejong","gangwon","chungbuk","chungnam","jeonbuk","jeonnam","gyeongbuk","gyeongnam","jeju"];
  const index = order.findIndex((key) => String(slug || '').startsWith(key));
  return index === -1 ? 99 : index;
}

function toJsonStringLiteral(value) {
  return JSON.stringify(JSON.stringify(value));
}

async function readJsonIfExists(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}
