import { areaGroups, carwashes, typeGroups } from '../data/siteData';
import { domainConfig } from '../data/domainConfig';
import { keywordPages } from '../data/keywordPages';
import { guidePages } from '../data/guidePages';

const pages = [
  '/',
  '/about/',
  '/privacy/',
  '/correction/',
  ...areaGroups.map((group) => `/area/${group.slug}/`),
  ...typeGroups.map((group) => `/type/${group.slug}/`),
  ...keywordPages.map((page) => `/keyword/${page.slug}/`),
  ...guidePages.map((page) => `/guide/${page.slug}/`),
  ...carwashes.map((item) => `/carwash/${item.slug}/`),
];

export function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${domainConfig.siteUrl}${page}</loc>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
