import { domainConfig } from '../data/domainConfig';

export function GET() {
  return new Response(`User-agent: *
Allow: /

Sitemap: ${domainConfig.siteUrl}/sitemap.xml
`);
}
