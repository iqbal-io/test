// Serverless function: GET /api/quote-of-the-day
// Returns today's quote, cached in-memory until midnight UTC and
// cached at the edge/CDN for a full day.

let cache = { data: null, dateKey: null };

const FALLBACK = { q: "Every day is a fresh start.", a: "Unknown" };

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

module.exports = async (req, res) => {
  // Fresh for 1 hour, stale-while-revalidate for up to 1 day.
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  const key = todayKey();
  if (cache.data && cache.dateKey === key) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cache.data);
  }

  try {
    const upstream = await fetch("https://zenquotes.io/api/today", {
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) throw new Error(`Upstream responded ${upstream.status}`);

    const [result] = await upstream.json();
    if (!result || !result.q) throw new Error("Malformed upstream payload");

    const payload = {
      quote: result.q,
      author: result.a || "Unknown",
      date: key,
      source: "zenquotes",
    };

    cache = { data: payload, dateKey: key };
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(payload);
  } catch (err) {
    const payload = { quote: FALLBACK.q, author: FALLBACK.a, date: key, source: "fallback" };
    res.setHeader("X-Cache", "FALLBACK");
    return res.status(200).json(payload);
  }
};
