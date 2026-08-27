# Daily Spark

A simple, SEO-friendly quotes site: static HTML/CSS/JS in `public/`, plus two
Vercel serverless functions in `api/` that fetch quotes from
[ZenQuotes](https://zenquotes.io) and cache them.

## Structure

```
public/
  index.html        Main page (SEO tags, JSON-LD, real fallback quote for no-JS/crawlers)
  style.css
  script.js          Fetches /api/quote and /api/quote-of-the-day, caches in localStorage
  images/            favicon.svg, og-image.svg
  robots.txt
  sitemap.xml
  manifest.json
api/
  quote.js               GET /api/quote — random quote, 60s in-memory + edge cache
  quote-of-the-day.js    GET /api/quote-of-the-day — daily quote, cached until next day
vercel.json          Clean URLs + long-lived cache headers for static assets
```

## Caching strategy

- **Edge/CDN**: each function sets `Cache-Control: s-maxage=...,
  stale-while-revalidate=...` so Vercel's network caches the JSON response
  and serves stale copies instantly while revalidating in the background.
- **Server (per warm lambda)**: an in-memory object holds the last fetched
  quote so repeated invocations on a warm instance skip the upstream call
  entirely.
- **Client**: `script.js` writes the last successful response to
  `localStorage` and paints it immediately on next visit before revalidating
  against the network — instant perceived load, graceful offline fallback.
- **Upstream failure fallback**: if ZenQuotes is unreachable, each function
  returns a small built-in set of quotes so the site never shows an error.

## Run locally

```bash
npm install -g vercel
vercel dev
```

Then open the printed local URL.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — no build
step is required (static `public/` + zero-config `api/` functions).

**Before deploying to production**, replace `https://your-site.vercel.app/`
in `public/index.html`, `public/robots.txt`, and `public/sitemap.xml` with
your real deployed domain.
