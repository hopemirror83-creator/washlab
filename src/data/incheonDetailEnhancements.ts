import { getIncheonPremiumReview } from './incheonPremiumReviews';

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

type DetailEnhancement = {
  tierLabel: string;
  basic: string[];
  facility: string[];
  review: string[];
  positivePoints: string[];
  cautionPoints: string[];
  answerCards: AnswerCard[];
};

const SPECIAL_NOTES: Record<string, { review?: string[]; positives?: string[]; cautions?: string[] }> = {
  '킹콩샤워 검단점': {
    review: [
      '네이버 블로그 후기에서는 검단 셀프세차장, 24시간 셀프세차장 같은 표현이 반복됩니다. 직접 세차를 하려는 이용자가 공간, 장비 구성, 이용 흐름을 확인하기 위해 많이 찾아보는 곳으로 보입니다.',
      '후기 제목과 내용에서는 셀프세차 베이, 폼세차, 진공청소기, 세차 동선에 대한 언급이 보입니다. 세차장이 넓고 이용하기 편했다는 의견이 있으며, 검단권에서 늦은 시간 세차장을 찾는 사람에게 후보가 될 수 있습니다.',
    ],
    positives: ['검단 셀프세차장으로 검색되는 글이 여러 건 있어 방문 전 분위기를 살펴보기 좋습니다.', '공간과 장비 구성, 셀프세차 과정에 대한 후기가 반복됩니다.'],
    cautions: ['24시간 운영 여부와 요금은 방문 시점에 달라질 수 있으니 업체 안내를 함께 확인하는 편이 좋습니다.'],
  },
  '킹콩샤워 불로점': {
    review: [
      '불로동과 검단신도시 쪽 셀프세차장을 찾는 글에서 자주 언급되는 곳입니다. 네이버 블로그에는 폼세차, 셀프세차, 세차장 추천 성격의 글이 여러 건 확인됩니다.',
      '일부 글에서는 세차 공간과 이용 편의성을 긍정적으로 다루고 있습니다. 킹콩샤워 계열점을 비교해 보는 이용자라면 검단점, 청라점과 함께 살펴볼 만합니다.',
    ],
    positives: ['검단신도시, 불로동 셀프세차 키워드와 잘 맞는 후기가 있습니다.', '사진이 포함된 글을 보면 베이와 드라잉 공간 분위기를 미리 볼 수 있습니다.'],
  },
  '킹콩샤워 청라점': {
    review: [
      '청라 셀프세차장을 찾는 이용자 후기가 여러 건 있습니다. 리뉴얼, 24시, 연중무휴 같은 표현이 보이며, 청라권에서 늦은 시간 세차 후보로 찾는 사람이 많은 편입니다.',
      '후기에서는 묵은 때를 벗기고 왔다는 식의 이용 경험, 셀프세차 과정, 공간 분위기 등이 언급됩니다. 다만 리뉴얼이나 운영시간 관련 내용은 글 작성 시점에 따라 달라질 수 있습니다.',
    ],
    positives: ['청라 셀프세차장 관련 블로그 글이 여러 건 있어 비교 자료가 많은 편입니다.', '늦은 시간 이용 가능성을 언급한 글이 있어 야간 세차 후보로 검토하기 좋습니다.'],
  },
  '워시보이게러지 실내셀프세차': {
    review: [
      '워시보이게러지는 실내 셀프세차장이라는 점이 후기에서 가장 자주 보입니다. 겨울 한파, 쾌적한 실내 세차 같은 표현이 반복되어 날씨 영향을 덜 받고 세차하고 싶은 이용자에게 맞는 후보로 보입니다.',
      '후기에서는 실내 공간, 셀프세차 동선, 세차장 분위기를 다룬 글이 많습니다. 추운 날이나 더운 날에도 비교적 편하게 세차할 수 있다는 의견이 보여 계절 영향을 중요하게 보는 분이 참고하기 좋습니다.',
    ],
    positives: ['실내 셀프세차장이라는 특징이 후기 제목에서 분명하게 드러납니다.', '겨울철이나 날씨가 좋지 않은 날 이용 편의성을 언급한 글이 있습니다.'],
  },
  '컴인워시 청라점 24시': {
    review: [
      '컴인워시 청라점은 노터치 세차, 24시 세차장 키워드로 확인되는 글이 많습니다. 손으로 문지르는 세차보다 자동·노터치 방식의 편의성을 우선하는 이용자에게 맞는 후보입니다.',
      '테슬라 모델Y 등 차량 사례가 포함된 후기도 있어, 자동세차 방식이 걱정되는 분들이 실제 이용 분위기를 살펴보기 좋습니다. 다만 노터치 세차 특성상 오염 상태에 따라 만족도가 다를 수 있습니다.',
    ],
    positives: ['노터치 세차 관련 후기가 많아 자동세차 후보로 보기 좋습니다.', '24시 이용 가능성을 다룬 글이 있어 늦은 시간 세차 수요와 맞습니다.'],
    cautions: ['묵은 오염이나 하부 오염 제거는 차량 상태에 따라 체감 차이가 있을 수 있습니다.'],
  },
  '올댓워시 인천 서구점': {
    review: [
      '올댓워시 인천 서구점은 노터치세차, 자동세차, 검단 세차 키워드가 후기에서 반복됩니다. 기스 걱정이 적은 세차 방식을 찾는 이용자가 많이 살펴보는 곳으로 보입니다.',
      '블로그 글에서는 자동세차 이용 흐름과 결과를 중심으로 다루는 경우가 많습니다. 빠르게 세차를 끝내고 싶은 분, 셀프세차가 번거로운 분에게 비교 후보가 됩니다.',
    ],
    positives: ['노터치 자동세차 관련 후기가 여러 건 있어 방식 확인이 쉽습니다.', '검단권 자동세차 후보로 검색되는 흐름이 보입니다.'],
  },
  'JR AUTO': {
    review: [
      'JR AUTO는 청라 셀프세차장으로 언급되는 글이 여러 건 있습니다. 한적하고 저렴하다는 표현이 보이며, 북적임보다 차분한 이용 분위기를 찾는 분이 살펴볼 만합니다.',
      '후기에서는 청라권 셀프세차장 이용 경험, 비용감, 접근성에 대한 이야기가 확인됩니다. 세부 장비나 운영 방식은 방문 전에 네이버 지도 사진과 함께 보는 것이 좋습니다.',
    ],
    positives: ['청라 셀프세차장으로 직접 다녀온 글이 확인됩니다.', '한적함과 비용감을 언급한 후기가 있어 선택 기준이 뚜렷합니다.'],
  },
  '디테일링 창과방패': {
    review: [
      '디테일링 창과방패는 일반 셀프세차장보다는 손세차, 디테일링, 실내 관리 수요에 가까운 업체입니다. 관련 블로그 후기에서는 검단·석남동권에서 꼼꼼한 관리가 필요한 차량을 맡기는 흐름으로 살펴보는 것이 좋습니다.',
      '후기 자료가 셀프세차장처럼 많지는 않지만, 손세차나 디테일링 업체는 가격보다 작업 범위가 더 중요합니다. 외부 세차만 필요한지, 실내세차와 광택·코팅 상담까지 필요한지를 먼저 나눠 보는 편이 좋습니다.',
    ],
    positives: ['손세차와 디테일링 성격이 분명해 목적이 맞는 방문자에게 적합합니다.', '셀프세차보다 맡기는 세차를 찾는 경우 비교 후보가 됩니다.'],
    cautions: ['작업 범위와 예약 가능 시간은 업체에 직접 확인하는 편이 좋습니다.'],
  },
};

function known(value?: string) {
  if (!value) return false;
  return !['정보 없음', '요금 정보 없음', '확인안됨', '확인 안됨'].some((token) => value.includes(token));
}

function serviceKind(carwash: CarwashLike) {
  const text = [carwash.name, carwash.washType, carwash.category, ...(carwash.serviceLabels || [])].join(' ');
  if (/노터치|컴인워시|올댓워시|자동/.test(text)) return 'automatic';
  if (/손세차|디테일|스팀|광택|코팅|실내|크리닝|유리막|카케어/.test(text)) return 'hand';
  return 'self';
}

function serviceLabel(kind: string) {
  if (kind === 'automatic') return '노터치·자동세차';
  if (kind === 'hand') return '손세차·디테일링';
  return '셀프세차';
}

function sourceTitles(carwash: CarwashLike) {
  return (carwash.sourceRefs || [])
    .map((source) => source.title)
    .filter(Boolean)
    .slice(0, 3) as string[];
}

function titleHint(carwash: CarwashLike) {
  const titles = sourceTitles(carwash);
  if (titles.length === 0) return '';
  return `확인된 글 제목에는 “${titles[0]}”${titles[1] ? `, “${titles[1]}”` : ''} 같은 표현이 보입니다.`;
}

function buildBasic(carwash: CarwashLike, kind: string): string[] {
  const area = carwash.areaLabel || ['인천', carwash.district, carwash.dong].filter(Boolean).join(' ');
  const address = carwash.roadAddress || carwash.lotAddress || '주소 정보 확인 필요';
  const typeText = serviceLabel(kind);
  const first = `${carwash.name}은 ${area}에서 확인되는 ${typeText} 업체입니다. 주소는 ${address} 기준으로 정리했으며, 지도에서는 길찾기와 최신 영업 상태를 함께 확인하는 것이 좋습니다.`;
  const second =
    kind === 'automatic'
      ? '자동세차나 노터치 세차는 빠르게 이용할 수 있다는 장점이 있습니다. 대신 차량 오염 정도, 벌레 자국, 휠 주변 오염처럼 세밀한 부분은 세차 방식에 따라 결과 차이가 날 수 있습니다.'
      : kind === 'hand'
        ? '손세차와 디테일링은 단순 세차보다 작업 범위가 중요합니다. 외부 세차만 맡길지, 실내세차·스팀세차·광택·유리막코팅 상담까지 필요한지에 따라 비용과 소요 시간이 달라질 수 있습니다.'
        : '셀프세차장은 베이 수, 드라잉 공간, 진공청소기 위치, 매트세척기 같은 마무리 장비가 체감 만족도를 크게 좌우합니다. 특히 주말에는 대기 여부도 함께 보는 편이 좋습니다.';
  return [first, second];
}

function buildFacility(carwash: CarwashLike, kind: string): string[] {
  const labels = (carwash.serviceLabels || []).filter(Boolean).join(', ') || serviceLabel(kind);
  const hours = known(carwash.weekdayHours) ? `운영시간은 ${carwash.weekdayHours}로 표시되어 있습니다.` : '운영시간은 네이버 지도나 업체 안내에서 다시 확인하는 편이 좋습니다.';
  const fee = known(carwash.feeInfo) ? `요금은 ${carwash.feeInfo} 기준으로 확인됩니다.` : '요금은 코스, 차종, 옵션에 따라 달라질 수 있어 현장 안내를 확인하는 것이 좋습니다.';
  const facility =
    kind === 'automatic'
      ? '노터치·자동세차는 세차 속도가 빠른 대신 코스별 포함 범위가 다를 수 있습니다. 하부세차, 건조, 추가 옵션 여부를 같이 보면 선택이 쉬워집니다.'
      : kind === 'hand'
        ? '손세차 업체는 예약제 여부, 실내세차 포함 범위, 광택·코팅 상담 가능 여부가 중요합니다. 작업 전 차량 상태를 보여주고 포함 범위를 확인하면 불필요한 오해를 줄일 수 있습니다.'
        : '셀프세차는 고압수, 폼건, 드라잉존, 진공청소기, 매트세척기 위치를 함께 보면 좋습니다. 하부세차나 카드결제 가능 여부는 지점마다 차이가 날 수 있습니다.';
  return [`워시랩에서 확인한 분류는 ${labels}입니다. ${hours} ${fee}`, facility];
}

function buildReview(carwash: CarwashLike, kind: string): string[] {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  const special = SPECIAL_NOTES[carwash.name]?.review;
  if (special) return special;
  if (count >= 5) {
    const hint = titleHint(carwash);
    return [
      `네이버 블로그에서는 ${carwash.name} 관련 글 ${count}건을 확인했습니다. ${hint} 후기 제목과 내용을 보면 ${serviceLabel(kind)} 이용 흐름, 공간 분위기, 위치를 미리 살펴보려는 글이 많습니다.`,
      kind === 'hand'
        ? '손세차나 디테일링 후기는 작업 결과를 사진으로 보여주는 경우가 많습니다. 다만 차량 상태와 선택한 코스에 따라 만족도가 달라질 수 있으니, 후기는 분위기와 작업 범위를 가늠하는 자료로 보는 것이 좋습니다.'
        : kind === 'automatic'
          ? '자동세차 후기는 빠른 이용과 편의성을 중심으로 보는 것이 좋습니다. 노터치 방식은 차량에 닿는 부담이 적다는 장점이 있지만, 오염이 심한 차량은 추가 세차가 필요할 수 있다는 점도 함께 봐야 합니다.'
          : '셀프세차 후기는 베이 폭, 드라잉존, 장비 상태, 대기 시간에 대한 의견이 도움이 됩니다. 사진이 있는 글을 보면 실제 공간감과 이용 동선을 미리 확인할 수 있습니다.',
    ];
  }
  if (count > 0) {
    const hint = titleHint(carwash);
    return [
      `네이버 블로그에서 ${carwash.name} 관련 글 ${count}건을 확인했습니다. ${hint} 글 수가 아주 많지는 않지만, 위치와 이용 분위기를 확인하는 참고 자료로는 충분합니다.`,
      '이 내용은 네이버 블로그의 후기를 모은 분석으로 실제 상황은 달라졌을 수 있으니, 방문 전에 업체 쪽에 확인해 보시는 것도 좋을 것 같습니다.',
    ];
  }
  return [
    `현재 워시랩에서 확인한 ${carwash.name}의 네이버 블로그 후기는 많지 않습니다. 대신 네이버 지도에 등록된 업체 정보와 이름, 위치, 분류를 기준으로 방문 전 살펴볼 내용을 정리했습니다.`,
    kind === 'hand'
      ? '후기가 적은 손세차·디테일링 업체는 예약 가능 여부와 작업 범위를 먼저 묻는 것이 가장 현실적입니다. 외부 세차, 실내세차, 광택·코팅 중 어디까지 필요한지 말하면 상담이 훨씬 쉬워집니다.'
      : '후기가 적은 세차장은 지도 사진, 최근 영업 상태, 전화 연결 가능 여부를 먼저 보는 것이 좋습니다. 특히 운영시간과 요금은 현장 상황에 따라 바뀔 수 있습니다.',
  ];
}

function buildPositive(carwash: CarwashLike, kind: string): string[] {
  const special = SPECIAL_NOTES[carwash.name]?.positives || [];
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  const base =
    kind === 'automatic'
      ? ['자동·노터치 세차 후보로 보기 좋습니다.', '빠르게 세차를 끝내고 싶은 이용자에게 맞는 성격입니다.']
      : kind === 'hand'
        ? ['손세차나 디테일링 목적이 분명한 업체입니다.', '차량 상태에 맞춰 작업 범위를 상담하기 좋은 유형입니다.']
        : ['셀프세차 후보로 보기 좋습니다.', '베이와 드라잉 공간, 장비 구성을 미리 확인하면 선택이 쉬워집니다.'];
  if (count >= 5) return [...special, `네이버 블로그 후기 ${count}건을 참고할 수 있습니다.`, ...base].slice(0, 5);
  if (count > 0) return [...special, `확인된 블로그 후기 ${count}건이 있습니다.`, ...base].slice(0, 4);
  return [...special, ...base, '네이버 지도에서 위치와 최신 사진을 먼저 확인하기 좋습니다.'].slice(0, 4);
}

function buildCautions(carwash: CarwashLike, kind: string): string[] {
  const special = SPECIAL_NOTES[carwash.name]?.cautions || [];
  const common = [
    known(carwash.weekdayHours) ? `운영시간은 ${carwash.weekdayHours}로 보이지만, 공휴일이나 야간에는 달라질 수 있습니다.` : '운영시간은 방문 전에 네이버 지도나 전화로 확인하는 편이 좋습니다.',
    known(carwash.feeInfo) ? '요금은 선택 코스와 옵션에 따라 실제 결제 금액이 달라질 수 있습니다.' : '요금 정보는 현장 안내나 업체 문의로 확인하는 것이 좋습니다.',
  ];
  const byKind =
    kind === 'hand'
      ? '손세차·디테일링은 예약 여부와 작업 범위를 먼저 확인해야 합니다.'
      : kind === 'automatic'
        ? '자동세차는 오염이 심한 차량일수록 결과 차이가 날 수 있습니다.'
        : '주말이나 저녁 시간에는 대기가 생길 수 있으니 여유 시간을 두는 편이 좋습니다.';
  return [...special, ...common, byKind].slice(0, 4);
}

function buildAnswerCards(carwash: CarwashLike, kind: string): AnswerCard[] {
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  return [
    {
      label: '세차 유형',
      value: serviceLabel(kind),
      note: kind === 'hand' ? '맡기는 세차나 관리형 작업에 가깝습니다.' : kind === 'automatic' ? '자동·노터치 방식 중심으로 확인됩니다.' : '직접 세차하는 셀프세차장 성격입니다.',
    },
    {
      label: '후기 자료',
      value: count > 0 ? `${count}건 확인` : '많지 않음',
      note: count > 0 ? '네이버 블로그 글을 참고해 분위기를 정리했습니다.' : '지도 정보와 업체 기본정보 중심으로 정리했습니다.',
    },
    {
      label: '운영시간',
      value: known(carwash.weekdayHours) ? carwash.weekdayHours || '확인 필요' : '확인 필요',
      note: known(carwash.weekdayHours) ? '표시된 시간 기준이며 변동 가능성이 있습니다.' : '방문 전 최신 영업 상태를 확인해 주세요.',
    },
    {
      label: '요금',
      value: known(carwash.feeInfo) ? carwash.feeInfo || '확인 필요' : '확인 필요',
      note: kind === 'hand' ? '차종과 작업 범위에 따라 달라질 수 있습니다.' : '코스와 옵션에 따라 달라질 수 있습니다.',
    },
  ];
}

export function getIncheonDetailEnhancement(carwash: CarwashLike): DetailEnhancement | null {
  const premium = getIncheonPremiumReview(carwash);
  if (premium) return premium;
  if (carwash.cityLabel !== '인천') return null;
  const kind = serviceKind(carwash);
  const count = carwash.sourceRefs?.length || carwash.sourceCount || 0;
  const tierLabel = count >= 5 ? '후기 강화 페이지' : count > 0 ? '중간 후기 페이지' : kind === 'hand' ? '손세차 기본 페이지' : '기본 정보 페이지';
  return {
    tierLabel,
    basic: buildBasic(carwash, kind),
    facility: buildFacility(carwash, kind),
    review: buildReview(carwash, kind),
    positivePoints: buildPositive(carwash, kind),
    cautionPoints: buildCautions(carwash, kind),
    answerCards: buildAnswerCards(carwash, kind),
  };
}
