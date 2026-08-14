import { readFile, writeFile } from 'node:fs/promises';

const FILE = 'data/generated-carwash-pages.json';
const pages = JSON.parse(await readFile(FILE, 'utf8'));
let changed = 0;

for (const page of pages) {
  if (!/^gemini-.*-premium$/.test(String(page.aiProvider || ''))) continue;
  const before = JSON.stringify(page);
  for (const key of ['introSection', 'facilitySection', 'reviewSection', 'fieldCheckSection', 'conclusionSection']) {
    page[key] = polishText(page[key]);
  }
  page.positivePoints = polishList(page.positivePoints);
  page.cautionPoints = polishList(page.cautionPoints);
  if (JSON.stringify(page) !== before) changed += 1;
}

await writeFile(FILE, `${JSON.stringify(pages, null, 2)}\n`, 'utf8');
console.log(`Polished premium pages: ${changed}`);

function polishList(value) {
  if (!Array.isArray(value)) return value;
  return value.map(polishText).filter(Boolean);
}

function polishText(value) {
  return String(value || '')
    .replace(/제공된 네이버 블로그 후기 자료들은 아쉽게도/g, '네이버 블로그에서 확인되는 글만 보면')
    .replace(/제공된 네이버 블로그 후기들은/g, '네이버 블로그에서 확인되는 글들은')
    .replace(/제공된 네이버 블로그 참고 글들은/g, '네이버 블로그에서 확인되는 참고 글들은')
    .replace(/제공된 정보에는/g, '현재 확인되는 글만 보면')
    .replace(/제공된 자료에는/g, '현재 확인되는 자료에는')
    .replace(/직접적인 방문 후기가 아니었습니다/g, '구체적인 방문 후기가 많지는 않습니다')
    .replace(/직접적인 세차 경험에 대한 상세한 최신 정보는 찾기 어렵습니다/g, '구체적인 세차 경험을 담은 최신 후기는 많지 않은 편입니다')
    .replace(/이 세차장 자체에 대한 상세한 방문 후기는 찾기 어려웠습니다/g, '이 세차장만을 다룬 상세 방문 후기는 많지 않은 편입니다')
    .replace(/아쉽게도\s*/g, '')
    .replace(/높은 만족도를 얻고 있습니다/g, '긍정적으로 언급됩니다')
    .replace(/높은 만족도를 얻고 있는/g, '긍정적인 의견이 보이는')
    .replace(/좋은 평가를 받고 있습니다/g, '긍정적으로 언급됩니다')
    .replace(/호평을 받습니다/g, '좋게 보는 의견이 있습니다')
    .replace(/가장 큰 장점으로 꼽습니다/g, '장점으로 언급하는 글이 있습니다')
    .replace(/최우선으로 하는/g, '중요하게 보는')
    .replace(/방문객들에게 좋은 인상을 주고 있습니다/g, '방문자에게 깔끔한 인상을 준다는 의견이 있습니다')
    .replace(/많은 분들이/g, '여러 이용자가')
    .replace(/많은 방문객이/g, '일부 방문자가')
    .replace(/많은 이용자들이/g, '여러 이용자가')
    .replace(/많은 운전자들의/g, '운전자들의')
    .replace(/최고의|완벽한/g, '괜찮은')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
