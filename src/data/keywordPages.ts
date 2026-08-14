const actualKeywords = [
  ['nearby-auto-carwash', '근처 자동세차장'],
  ['nobrush-auto-carwash-location', '노브러쉬 자동세차 위치'],
  ['notouch-carwash-location', '노터치 세차장 위치'],
  ['hand-carwash-recommendation', '손세차장 추천'],
  ['interior-carwash-price', '실내세차 가격'],
  ['detailing-carwash-price', '디테일링세차 가격'],
  ['detailing-carwash-rabd-price', '디테일링세차 랩드 가격'],
  ['steam-carwash-recommendation', '스팀세차 추천'],
  ['self-carwash-garage-method', '셀프세차장 개러지 방법'],
  ['night-self-carwash', '야간 셀프세차장'],
  ['busanjingu-hand-carwash', '부산진구 손세차'],
  ['seongdonggu-interior-carwash', '성동구 실내세차'],
  ['gwangjingu-steam-carwash', '광진구 스팀세차'],
  ['yangju-interior-carwash', '양주 실내세차장'],
  ['seogwipo-carwash', '서귀포 세차'],
  ['yeosu-carwash', '여수 세차장'],
  ['dangjin-market-hand-carwash', '당진 시장 손세차'],
  ['suwon-plaza-carwash', '수원 광장 세차장'],
  ['changwon-washzone-garage-method', '창원 워시존 개러지 방법'],
  ['ulsan-wolpyeongro-nobrush-carwash', '울산 월평로 노브러쉬세차'],
  ['hongje-station-self-carwash', '홍제역 부근 셀프세차장'],
  ['osong-carwash-location', '오송세차장 위치'],
  ['yeongjongdo-notouch-auto-carwash', '영종도 노터치 자동세차'],
  ['gaegeum-notouch-carwash', '개금 노터치세차'],
  ['sangmu-district-notouch-carwash', '상무지구 노터치 세차'],
  ['joam-notouch-carwash', '조암 노터치세차장'],
  ['sintanjin-self-carwash-garage', '신탄진 셀프세차장 개러지'],
  ['osong-underbody-detailing-carwash', '오송 하부디테일링 세차'],
  ['interior-underbody-carwash', '실내세차 내부세차 실내크리닝'],
  ['black-car-polishing-carwash', '검은색 차량 광택 세차'],
] as const;

const cities = [
  ['seoul', '서울'],
  ['incheon', '인천'],
  ['gyeonggi', '경기'],
  ['busan', '부산'],
  ['daegu', '대구'],
  ['daejeon', '대전'],
  ['gwangju', '광주'],
  ['ulsan', '울산'],
  ['sejong', '세종'],
  ['gangwon', '강원'],
  ['chungbuk', '충북'],
  ['chungnam', '충남'],
  ['jeonbuk', '전북'],
  ['jeonnam', '전남'],
  ['gyeongbuk', '경북'],
  ['gyeongnam', '경남'],
  ['jeju', '제주'],
] as const;

const services = [
  ['self-carwash', '셀프세차장'],
  ['auto-carwash', '자동세차장'],
  ['hand-carwash', '손세차'],
  ['notouch-carwash', '노터치세차'],
  ['interior-carwash', '실내세차'],
] as const;

const generatedKeywords = cities.flatMap(([citySlug, city]) =>
  services.map(([serviceSlug, service]) => [
    `${citySlug}-${serviceSlug}`,
    `${city} ${service} 추천`,
  ] as const),
);

const stopWords = new Set(['추천', '비교', '가격', '위치', '방법', '후기', '세차장', '세차']);
const keywordSeeds = [...actualKeywords, ...generatedKeywords].slice(0, 100);

export const keywordPages = keywordSeeds.map(([slug, keyword]) => {
  const terms = keyword
    .replace(/[·,]/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !stopWords.has(term));

  return {
    slug,
    keyword,
    title: `${keyword} 찾기: 위치, 요금, 후기 비교`,
    description: `${keyword} 검색 의도에 맞는 세차장을 정리했습니다. 네이버 지도 위치, 운영시간, 요금 단서, 블로그 후기와 방문 전 확인할 점을 함께 볼 수 있습니다.`,
    terms,
  };
});
