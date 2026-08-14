import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const OUT_DIR = path.join(DATA_DIR, 'vertex-test');
const TARGET_NAMES = ['킹콩샤워 검단점', '디테일링 창과방패'];

const { carwashes } = await import(`../src/data/siteData.ts?x=${Date.now()}`);
const reviewGroups = await readJsonIfExists(path.join(DATA_DIR, 'naver-review-sources.json'), []);
const reviewMap = new Map(reviewGroups.map((group) => [group.sourceId, group]));

const targets = carwashes
  .filter((item) => TARGET_NAMES.includes(item.name) && item.cityLabel === '인천' && item.district === '서구')
  .map((item) => {
    const group = reviewMap.get(item.sourceId) || { sources: [] };
    const sources = (group.sources || [])
      .filter((source) => source?.link && !/\.pdf(?:$|[?#])/i.test(source.link))
      .map((source) => ({
        title: source.title,
        link: source.link,
        description: source.description,
        bloggerName: source.bloggerName,
        postdate: source.postdate,
        query: source.query,
      }));
    return {
      collectedAt: new Date().toISOString(),
      name: item.name,
      slug: item.slug,
      sourceId: item.sourceId,
      areaLabel: item.areaLabel,
      address: item.roadAddress || item.lotAddress || '',
      lotAddress: item.lotAddress || '',
      phone: item.phone || '',
      category: item.category || '',
      washType: item.washType || '',
      serviceLabels: item.serviceLabels || [],
      hours: {
        weekday: item.weekdayHours || '',
        holiday: item.holidayHours || '',
        closedDays: item.closedDays || '',
      },
      feeInfo: item.feeInfo || '',
      naverMapUrl: item.naverMapUrl || '',
      currentWashlabReview: item.reviewSection || '',
      currentPositivePoints: item.positivePoints || [],
      currentCautionPoints: item.cautionPoints || [],
      sources,
      sourceSummary: {
        count: sources.length,
        titles: sources.map((source) => source.title),
      },
    };
  });

await mkdir(OUT_DIR, { recursive: true });
await writeFile(path.join(OUT_DIR, 'carwash-vertex-input.json'), `${JSON.stringify(targets, null, 2)}\n`, 'utf8');

const authorPrompt = buildAuthorPrompt(targets);
await writeFile(path.join(OUT_DIR, 'vertex-author-prompt.md'), authorPrompt, 'utf8');

console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, 'carwash-vertex-input.json'))}`);
console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, 'vertex-author-prompt.md'))}`);
for (const item of targets) {
  console.log(`${item.name}: sources=${item.sources.length}`);
}

function buildAuthorPrompt(items) {
  return `# 워시랩 세차장 콘텐츠 작성 요청

아래 지시를 우선해 작성합니다.

## 검색에이전트 수집 기준
- 정확하고 신뢰할 수 있는 정보를 우선합니다.
- 다양한 출처를 통해 정보를 수집하고 사실 확인을 합니다.
- URL 끝이 pdf로 끝나는 자료는 제외했습니다.
- 직접 이용한 것처럼 쓰지 않고, 확인 가능한 정보와 후기 표현만 사용합니다.

## 작성에이전트 지시
이전 모든 지시는 배제하고 아래 지시를 우선해주세요.
당신은 독자들이 쉽게 이해하고 공감할 수 있는 콘텐츠를 만듭니다.
정보 전달과 함께 독자의 관심을 끌 수 있는 글쓰기에 능숙합니다.
주요 포털 사이트와 SNS에서 잘 노출될 수 있는 콘텐츠 최적화 능력이 있습니다.
검색 최적화(SEO)를 고려하여 적절한 키워드를 자연스럽게 사용해 주세요.
블로그 포스트는 업체별 2000자 이상으로 작성하며, 필요시 마크다운 형식의 링크나 표를 포함해 주세요.
한국인들이 사용하지 않는 단어와 표현을 사용하지 마세요.

- 세차장의 기본정보에 대해서 읽기좋게 서술해주세요.
- 후기도 작성해주세요. 다만 내가 가보았다가 아니라 "이런 후기도 있습니다", "세차장이 넓어서 쾌적하다는 후기가 있습니다", "고장난 장비가 있어서 불편했다는 후기도 있습니다"처럼 전달해주세요.
- 후기가 없으면 "이 세차장은 후기가 없습니다"라고 기술해 주세요.
- 과장 광고 문구는 쓰지 마세요.
- 아래 수집 데이터에 없는 정보는 단정하지 마세요.

## 작성 대상 데이터

\`\`\`json
${JSON.stringify(items, null, 2)}
\`\`\`
`;
}

async function readJsonIfExists(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return [];
  }
}
