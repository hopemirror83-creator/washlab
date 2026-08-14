type CarwashLike = {
  name: string;
  slug: string;
  cityLabel?: string;
  district?: string;
  dong?: string;
  areaLabel?: string;
  washType?: string;
  category?: string;
  roadAddress?: string;
  lotAddress?: string;
  phone?: string;
  weekdayHours?: string;
  holidayHours?: string;
  feeInfo?: string;
  serviceLabels?: string[];
  sourceCount?: number;
  sourceRefs?: Array<{ title?: string; link: string }>;
  flags?: {
    selfWash?: boolean;
    automaticWash?: boolean;
    handWash?: boolean;
    lowerWash?: boolean;
    phoneKnown?: boolean;
    hoursKnown?: boolean;
    priceKnown?: boolean;
  };
};

type AnswerCard = {
  label: string;
  value: string;
  note: string;
};

type PremiumReview = {
  tierLabel: string;
  basic: string[];
  facility: string[];
  review: string[];
  positivePoints: string[];
  cautionPoints: string[];
  answerCards: AnswerCard[];
};

function isKnown(value?: string) {
  if (!value) return false;
  return !['정보 없음', '요금 정보 없음', '확인 필요', '확인안됨'].some((token) => value.includes(token));
}

function getKind(carwash: CarwashLike) {
  const text = [carwash.name, carwash.washType, carwash.category, ...(carwash.serviceLabels || [])].join(' ');
  if (/노터치|컴인워시|자동|바로세차/.test(text)) return 'automatic';
  if (/디테일|손세차|스팀|광택|코팅|보아스/.test(text)) return 'hand';
  return 'self';
}

function kindLabel(kind: string) {
  if (kind === 'automatic') return '노터치·자동세차';
  if (kind === 'hand') return '손세차·디테일링';
  return '셀프세차';
}

function titles(carwash: CarwashLike) {
  return (carwash.sourceRefs || []).map((source) => source.title).filter(Boolean).slice(0, 4) as string[];
}

function titleSentence(carwash: CarwashLike) {
  const list = titles(carwash);
  if (list.length === 0) return '블로그 제목만으로 세부 시설을 단정하기는 어렵지만, 방문 전 분위기를 살펴볼 수 있는 자료는 확인됩니다.';
  const shown = list.map((title) => `「${title}」`).join(', ');
  return `확인된 글 제목에는 ${shown} 같은 표현이 보입니다.`;
}

function buildBasic(carwash: CarwashLike, kind: string): string[] {
  const area = carwash.areaLabel || ['인천', carwash.district, carwash.dong].filter(Boolean).join(' ');
  const address = carwash.roadAddress || carwash.lotAddress || '주소 확인 필요';
  const phone = isKnown(carwash.phone) ? `전화번호는 ${carwash.phone}로 확인됩니다.` : '전화번호는 네이버 지도 상세 화면에서 다시 확인하는 편이 좋습니다.';
  const hours = isKnown(carwash.weekdayHours)
    ? `운영시간은 ${carwash.weekdayHours} 기준으로 표시됩니다.`
    : '운영시간은 방문 전 네이버 지도나 업체 안내를 한 번 더 확인하는 것이 좋습니다.';

  return [
    `${carwash.name}은 ${area}에서 ${kindLabel(kind)}를 찾는 분들이 비교해볼 만한 세차장입니다. 주소는 ${address}입니다. ${phone} ${hours}`,
    kind === 'automatic'
      ? '자동세차나 노터치 세차는 빠르게 이용하기 좋지만, 코스 구성과 건조 방식에 따라 만족도가 달라집니다. 세차 시간이 짧은 대신 하부세차, 프리워시, 건조 옵션이 포함되는지 확인하면 선택이 훨씬 쉬워집니다.'
      : kind === 'hand'
        ? '손세차와 디테일링 업체는 가격표보다 작업 범위가 더 중요합니다. 외부 세차만 맡길지, 실내세차와 틈새 청소까지 볼지, 광택이나 코팅 상담까지 필요한지에 따라 방문 전 확인할 내용이 달라집니다.'
        : '셀프세차장은 베이 간격, 드라잉 공간, 진공청소기와 매트 세척기 위치가 실제 이용감에 큰 영향을 줍니다. 특히 주말이나 퇴근 시간대에는 대기 여부까지 함께 보는 것이 좋습니다.',
  ];
}

function buildFacility(carwash: CarwashLike, kind: string): string[] {
  const labels = (carwash.serviceLabels || []).filter(Boolean).join(', ') || kindLabel(kind);
  const fee = isKnown(carwash.feeInfo)
    ? `요금은 ${carwash.feeInfo}로 표시됩니다.`
    : '요금은 코스와 옵션에 따라 달라질 수 있어 현장 가격표나 네이버 지도 안내를 확인하는 편이 안전합니다.';

  return [
    `워시랩에서 확인한 분류는 ${labels}입니다. ${fee}`,
    kind === 'automatic'
      ? '노터치·자동세차 계열은 차량을 오래 세워두기 어려운 날에 선택하기 좋습니다. 다만 벌레 자국, 묵은 오염, 휠 안쪽 오염처럼 손이 더 필요한 부분은 결과 차이가 생길 수 있어, 오염이 심한 차량은 추가 코스나 손세차 대안을 함께 비교해보는 편이 좋습니다.'
      : kind === 'hand'
        ? '손세차·디테일링 계열은 예약 가능 여부, 차종별 가격 차이, 실내세차 포함 범위를 먼저 보는 것이 좋습니다. 후기 사진이 있다면 작업 전후 차이와 실내 관리 범위를 확인하는 데 도움이 됩니다.'
        : '셀프세차 계열은 고압수, 폼건, 드라잉존, 진공청소기, 매트 세척기 같은 기본 동선이 중요합니다. 하부세차나 온수 개수대처럼 계절에 따라 체감이 큰 시설은 지도 사진이나 최근 후기를 함께 확인해 주세요.',
  ];
}

function buildReview(carwash: CarwashLike, kind: string): string[] {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  const titleText = titleSentence(carwash);
  const typeText = kindLabel(kind);
  const area = carwash.areaLabel || ['인천', carwash.district, carwash.dong].filter(Boolean).join(' ');

  const first =
    count > 0
      ? `네이버 블로그에서는 ${carwash.name} 관련 글 ${count}건을 확인했습니다. ${titleText}`
      : `${carwash.name}은 현재 워시랩에 정리된 블로그 후기가 많지는 않습니다.`;

  const second =
    kind === 'automatic'
      ? `${typeText} 후기는 대체로 이용 속도와 세차 방식에 대한 언급이 중심이 됩니다. 빠르게 세차를 끝낼 수 있다는 점을 좋게 보는 글이 있는 반면, 차량 오염 상태에 따라 결과가 달라질 수 있다는 점도 함께 봐야 합니다.`
      : kind === 'hand'
        ? `${typeText} 후기는 작업 결과, 상담 방식, 실내 관리 범위처럼 맡기는 과정에 대한 내용이 중요합니다. 단순히 가까운 곳을 고르기보다 어떤 작업까지 포함되는지 확인하고 예약하는 쪽이 만족도를 높이는 데 도움이 됩니다.`
        : `${typeText} 후기는 세차 베이의 여유, 드라잉 공간, 장비 상태, 대기 시간에 대한 이야기가 많이 도움이 됩니다. 직접 세차하는 곳은 작은 불편도 크게 느껴질 수 있어서, 방문 전 사진과 최근 글을 같이 보는 편이 좋습니다.`;

  return [
    first,
    second,
    `${area}에서 세차장을 고를 때는 위치만 보기보다 이용 목적을 먼저 정하는 것이 좋습니다. 빠르게 외부 오염만 줄이고 싶은지, 실내까지 정리하고 싶은지, 늦은 시간에 조용히 이용하고 싶은지에 따라 맞는 업체가 달라집니다.`,
    `이 내용은 네이버 블로그의 후기를 모은 분석으로 실제 상황은 달라졌을 수 있으니, 방문 전에 업체쪽에 운영시간과 요금, 이용 가능한 시설을 확인해 보시는 것도 좋을 것 같습니다.`,
  ];
}

function buildPositive(carwash: CarwashLike, kind: string): string[] {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  const base =
    kind === 'automatic'
      ? ['빠른 세차를 원하는 이용자에게 맞는 유형입니다.', '노터치나 자동세차 방식에 대한 후기가 있어 이용 흐름을 미리 살펴보기 좋습니다.']
      : kind === 'hand'
        ? ['차량을 맡겨 관리받는 손세차·디테일링 수요와 잘 맞습니다.', '작업 범위와 결과 사진을 비교해보고 방문하기 좋습니다.']
        : ['직접 세차하는 셀프세차 수요와 잘 맞습니다.', '세차 공간, 장비 구성, 드라잉 동선에 대한 후기를 참고하기 좋습니다.'];

  return [
    `네이버 블로그 후기 ${count}건을 기준으로 분위기를 확인했습니다.`,
    ...base,
    '사진이 포함된 글을 보면 베이 간격, 진공청소기 위치, 대기 공간을 미리 파악하는 데 도움이 됩니다.',
    '주변 같은 유형의 세차장과 함께 비교하면 선택지가 더 명확해집니다.',
  ];
}

function buildCautions(carwash: CarwashLike, kind: string): string[] {
  return [
    isKnown(carwash.weekdayHours)
      ? `표시된 운영시간은 ${carwash.weekdayHours}이지만, 공휴일이나 야간에는 달라질 수 있습니다.`
      : '운영시간은 방문 전 네이버 지도나 업체 안내로 확인하는 것이 좋습니다.',
    isKnown(carwash.feeInfo)
      ? '요금은 선택 코스와 옵션에 따라 실제 결제 금액이 달라질 수 있습니다.'
      : '요금 정보는 현장 가격표나 업체 문의로 확인하는 편이 안전합니다.',
    kind === 'automatic'
      ? '자동세차는 빠르지만 오염이 심한 차량은 추가 관리가 필요할 수 있습니다.'
      : kind === 'hand'
        ? '손세차와 디테일링은 예약 가능 시간과 작업 범위를 먼저 확인하는 것이 좋습니다.'
        : '셀프세차는 주말이나 저녁 시간대에 대기가 생길 수 있습니다.',
    '블로그 후기는 작성 시점이 다를 수 있으니 최신 지도 정보와 함께 보는 것이 좋습니다.',
  ];
}

function buildAnswerCards(carwash: CarwashLike, kind: string): AnswerCard[] {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  return [
    {
      label: '세차 유형',
      value: kindLabel(kind),
      note: kind === 'automatic' ? '빠른 외부 세차 목적에 맞습니다.' : kind === 'hand' ? '맡기는 세차나 관리 작업에 가깝습니다.' : '직접 세차하는 방식입니다.',
    },
    {
      label: '후기 자료',
      value: `블로그 ${count}건`,
      note: '후기 제목과 사진을 기준으로 분위기를 정리했습니다.',
    },
    {
      label: '운영시간',
      value: isKnown(carwash.weekdayHours) ? carwash.weekdayHours || '확인 필요' : '확인 필요',
      note: '방문 전 최신 영업 상태를 확인해 주세요.',
    },
    {
      label: '요금',
      value: isKnown(carwash.feeInfo) ? carwash.feeInfo || '확인 필요' : '확인 필요',
      note: '코스와 옵션에 따라 달라질 수 있습니다.',
    },
  ];
}

export function getIncheonPremiumReview(carwash: CarwashLike): PremiumReview | null {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  if (!['인천', '서울', '경기'].includes(carwash.cityLabel || '') || count <= 0) return null;
  const kind = getKind(carwash);

  return {
    tierLabel: '후기 풍부형 강화 페이지',
    basic: buildBasic(carwash, kind),
    facility: buildFacility(carwash, kind),
    review: buildReview(carwash, kind),
    positivePoints: buildPositive(carwash, kind),
    cautionPoints: buildCautions(carwash, kind),
    answerCards: buildAnswerCards(carwash, kind),
  };
}

export function isIncheonPremiumTarget(carwash: CarwashLike) {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  return ['인천', '서울', '경기'].includes(carwash.cityLabel || '') && count > 0;
}
