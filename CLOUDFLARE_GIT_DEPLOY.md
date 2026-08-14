# Cloudflare Pages Git deployment

Use these settings when creating the Git-integrated Pages project.

- Production branch: `main`
- Root directory: `/`
- Build command: `npm run build:cloudflare`
- Build output directory: `dist-current`
- Node version: `22`

Environment variables:

- `NODE_VERSION=22`
- `PAGES_WRANGLER_MAJOR_VERSION=4`

The 100,000-file Pages limit requires a paid Cloudflare plan. Free plans remain
limited to 20,000 files. Repository source data is stored in `data/packed/` and
restored automatically before the Astro build.

Before pushing updated car-wash or review data, run:

```bash
npm run data:pack
```
