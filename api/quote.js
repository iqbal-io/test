// Serverless function: GET /api/quote
// Returns a random quote. Cached in-memory per warm lambda instance,
// and cached at the edge/CDN via Cache-Control headers.

let cache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 60 * 1000; // 60s server-side cache

const FALLBACK_QUOTES = [
  { q: "The best way to predict the future is to create it.", a: "Peter Drucker" },
  { q: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
  { q: "What we think, we become.", a: "Buddha" },
  { q: "It always seems impossible until it's done.", a: "Nelson Mandela" },
  { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
];

function pickFallback() {
  return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
}

module.exports = async (req, res) => {
  // Edge/CDN caching: fresh for 60s, then served stale for up to 5 min while revalidating.
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

  const now = Date.now();
  if (cache.data && now - cache.timestamp < CACHE_TTL_MS) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cache.data);
  }

  try {
    const upstream = await fetch("https://zenquotes.io/api/random", {
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);

    const [result] = await upstream.json();
    if (!result || !result.q) throw new Error("Malformed upstream payload");

    const payload = {
      quote: result.q,
      author: result.a || "Unknown",
      source: "zenquotes",
      cachedAt: new Date(now).toISOString(),
    };

    cache = { data: payload, timestamp: now };
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    const fallback = pickFallback();
    const payload = {
      quote: fallback.q,
      author: fallback.a,
      source: "fallback",
      cachedAt: new Date(now).toISOString(),
    };
    res.setHeader("X-Cache", "FALLBACK");
    return res.status(200).json(payload);
  }
};
