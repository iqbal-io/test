(() => {
  "use strict";

  const QUOTE_CACHE_KEY = "ds:lastQuote";
  const QOTD_CACHE_KEY = "ds:qotd";
  const QOTD_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h client-side cache

  const els = {
    quoteText: document.getElementById("quote-text"),
    quoteAuthor: document.getElementById("quote-author"),
    quoteCard: document.getElementById("quote-card"),
    qotdText: document.getElementById("qotd-text"),
    qotdAuthor: document.getElementById("qotd-author"),
    qotdCard: document.getElementById("qotd-card"),
    newBtn: document.getElementById("new-quote-btn"),
    copyBtn: document.getElementById("copy-btn"),
    tweetBtn: document.getElementById("tweet-btn"),
    status: document.getElementById("status"),
    year: document.getElementById("year"),
  };

  els.year.textContent = new Date().getFullYear();

  function readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ...data, storedAt: Date.now() }));
    } catch {
      /* storage unavailable (private mode, quota) — fail silently */
    }
  }

  function setStatus(msg) {
    els.status.textContent = msg;
    if (msg) setTimeout(() => (els.status.textContent = ""), 2500);
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  function renderRandom(data) {
    els.quoteText.textContent = `“${data.quote}”`;
    els.quoteAuthor.textContent = `— ${data.author}`;
  }

  function renderQotd(data) {
    els.qotdText.textContent = `“${data.quote}”`;
    els.qotdAuthor.textContent = `— ${data.author}`;
  }

  async function loadRandomQuote({ useCacheFirst = false } = {}) {
    if (useCacheFirst) {
      const cached = readCache(QUOTE_CACHE_KEY);
      if (cached) renderRandom(cached);
    }

    els.quoteCard.classList.add("is-loading");
    try {
      const data = await fetchJSON("/api/quote");
      renderRandom(data);
      writeCache(QUOTE_CACHE_KEY, data);
    } catch (err) {
      if (!useCacheFirst) setStatus("Couldn't fetch a new quote — showing a cached one.");
      const cached = readCache(QUOTE_CACHE_KEY);
      if (cached) renderRandom(cached);
    } finally {
      els.quoteCard.classList.remove("is-loading");
    }
  }

  async function loadQuoteOfDay() {
    const cached = readCache(QOTD_CACHE_KEY);
    const fresh = cached && Date.now() - cached.storedAt < QOTD_CACHE_TTL_MS;
    if (fresh) {
      renderQotd(cached);
      return;
    }

    try {
      const data = await fetchJSON("/api/quote-of-the-day");
      renderQotd(data);
      writeCache(QOTD_CACHE_KEY, data);
    } catch {
      if (cached) renderQotd(cached);
      else els.qotdText.textContent = "Couldn't load today's quote.";
    }
  }

  async function copyQuote() {
    const text = `${els.quoteText.textContent} ${els.quoteAuthor.textContent}`;
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied to clipboard.");
    } catch {
      setStatus("Copy failed — select the text manually.");
    }
  }

  function shareOnX() {
    const text = `${els.quoteText.textContent} ${els.quoteAuthor.textContent}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  els.newBtn.addEventListener("click", () => loadRandomQuote());
  els.copyBtn.addEventListener("click", copyQuote);
  els.tweetBtn.addEventListener("click", shareOnX);

  document.addEventListener("keydown", (e) => {
    if (e.key === "n" || e.key === "N") {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      loadRandomQuote();
    }
  });

  // Show a cached quote instantly (if any), then revalidate against the API.
  loadRandomQuote({ useCacheFirst: true });
  loadQuoteOfDay();
})();
