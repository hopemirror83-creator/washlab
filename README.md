# 워시랩

인천 서구 세차장 정보를 공공데이터 기반으로 정리하는 Astro 정적 SEO 사이트입니다.

## 현재 범위

- 사이트명: 워시랩
- 도메인: https://washlab.product-pack.com
- 1차 지역: 인천광역시 서구
- 데이터 원본: `세차장정보.csv`
- 생성 페이지:
  - 메인 페이지
  - 세차장 상세 페이지
  - 지역/동/생활권 묶음 페이지
  - 세차유형 묶음 페이지
  - `sitemap.xml`, `robots.txt`

## 실행

```bash
npm install
npm run build:data
npm run collect:naver-reviews
npm run generate:review-pages
npm run check
npm run build
```

`npm run build`는 아래 순서로 실행됩니다.

1. CSV에서 인천 서구 세차장 데이터 생성
2. 기존 `dist-current` 정리
3. Astro 정적 사이트 빌드

## 데이터 생성

CSV 파일은 공공데이터 포털에서 받은 `세차장정보.csv`를 프로젝트 루트에 둡니다.
현재 파일은 EUC-KR 계열 인코딩이라 `scripts/build-carwash-data.mjs`에서 직접 디코딩합니다.

생성 파일:

- `data/carwashes.incheon-seogu.json`
- `src/data/siteData.ts`

## 오픈API

행정안전부 세차장정보 조회서비스를 정기 갱신용으로 사용할 예정입니다.
비밀키는 코드에 저장하지 말고 환경변수로만 사용합니다.

```bash
PUBLIC_DATA_API_URL=https://apis.data.go.kr/1741000/car_wash_info
PUBLIC_DATA_API_KEY=발급받은_일반_인증키
```

API의 실제 호출 path와 샘플 요청 URL이 확인되면 CSV 수집 스크립트와 같은 데이터 구조로 `sync:public-data`를 추가하면 됩니다.

## 후기 보강

네이버 블로그 검색과 Gemini 보강은 환경변수에서 키를 읽습니다.

```bash
NAVER_CLIENT_ID=발급받은_네이버_검색_CLIENT_ID
NAVER_CLIENT_SECRET=발급받은_네이버_검색_CLIENT_SECRET
GEMINI_API_KEY=발급받은_Gemini_API_KEY
```

실행 순서:

```bash
npm run build:data
npm run collect:naver-reviews
npm run generate:review-pages
npm run build
```

생성 파일:

- `data/naver-review-sources.json`
- `data/generated-carwash-pages.json`

## 다음 작업

- 네이버 블로그 검색 API로 후기 소스 수집
- Gemini로 상세페이지 후기/현장검수 문단 강화
- 네이버 지도 Client ID를 활용한 지도 영역 고도화
- Cloudflare Pages 배포 연결
