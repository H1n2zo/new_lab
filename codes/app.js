/**
 * NewsWire — Real-Time News Feed
 * Laboratory Practical 2: News API Integration
 */

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const PROXY_URL    = "/api/news";
const API_KEY      = "374833e57ee34ec5ade12925b13d25a3"; // hardcoded key
const MIN_ARTICLES = 5;

// ─────────────────────────────────────────────
// DOM REFERENCES
// ─────────────────────────────────────────────
const categorySelect = document.getElementById("categorySelect");
const keywordInput   = document.getElementById("keywordInput");
const fetchBtn       = document.getElementById("fetchBtn");
const newsGrid       = document.getElementById("newsGrid");
const statusBar      = document.getElementById("statusBar");

// ─────────────────────────────────────────────
// UTILITY: Show Status Bar
// ─────────────────────────────────────────────
function showStatus(message, type = "info") {
  statusBar.textContent = message;
  statusBar.className   = `status ${type}`;
}

function hideStatus() {
  statusBar.className = "status hidden";
}

// ─────────────────────────────────────────────
// UTILITY: Format date
// ─────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return "Unknown date";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

// ─────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────
function showSkeletons(count = 6) {
  newsGrid.innerHTML = "";
  for (let i = 0; i < count; i++) {
    newsGrid.innerHTML += `
      <div class="skeleton-card">
        <div class="skeleton-img"></div>
        <div class="skeleton-body">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line long"></div>
          <div class="skeleton-line med"></div>
          <div class="skeleton-line long"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>`;
  }
}

// ─────────────────────────────────────────────
// RENDER: Single Article Card
// ─────────────────────────────────────────────
function renderArticle(article, index) {
  const {
    title       = "No title available",
    description = null,
    urlToImage  = null,
    url         = "#",
    publishedAt = null,
    source      = {}
  } = article;

  const sourceName = source.name || "Unknown Source";
  const cleanDesc  = description
    ? (description.length > 160 ? description.slice(0, 157) + "…" : description)
    : "No description available for this article.";

  const imageHtml = urlToImage
    ? `<img
         class="article-image"
         src="${escapeHtml(urlToImage)}"
         alt="${escapeHtml(title)}"
         loading="lazy"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
       />
       <div class="article-image-placeholder" style="display:none;">📰</div>`
    : `<div class="article-image-placeholder">📰</div>`;

  const card = document.createElement("div");
  card.className = "article-card";
  card.style.animationDelay = `${index * 60}ms`;

  card.innerHTML = `
    ${imageHtml}
    <div class="article-body">
      <span class="article-source">${escapeHtml(sourceName)}</span>
      <h2 class="article-title">${escapeHtml(title)}</h2>
      <p class="article-description">${escapeHtml(cleanDesc)}</p>
      <div class="article-footer">
        <span class="article-date">🕐 ${formatDate(publishedAt)}</span>
        <a
          class="article-link"
          href="${escapeHtml(url)}"
          target="_blank"
          rel="noopener noreferrer"
        >Read Full Article ↗</a>
      </div>
    </div>`;

  return card;
}

// ─────────────────────────────────────────────
// UTILITY: Sanitize HTML to prevent XSS
// ─────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

// ─────────────────────────────────────────────
// BUILD API URL
// ─────────────────────────────────────────────
function buildApiUrl(category, keyword) {
  const params = new URLSearchParams({ apiKey: API_KEY });

  if (keyword && keyword.trim()) {
    params.set("q", keyword.trim());
  } else {
    params.set("category", category || "general");
  }

  return `${PROXY_URL}?${params}`;
}

// ─────────────────────────────────────────────
// MAIN: Fetch News
// ─────────────────────────────────────────────
async function fetchNews() {
  const category = categorySelect.value;
  const keyword  = keywordInput.value.trim();

  if (!category && !keyword) {
    showStatus("⚠️ Please select a category or enter a keyword before fetching.", "error");
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.querySelector(".btn-text").textContent = "Fetching…";
  showSkeletons(6);
  showStatus("⏳ Fetching latest news articles…", "loading");

  const url = buildApiUrl(category, keyword);

  try {
    const response = await fetch(url);
    const data     = await response.json();

    if (!response.ok || data.status === "error") {
      const msg = data.message || `HTTP error: ${response.status}`;
      handleFetchError(msg, response.status);
      return;
    }

    const articles = (data.articles || []).filter(a =>
      a.title && a.title !== "[Removed]" && a.url
    );

    if (articles.length === 0) {
      newsGrid.innerHTML = `
        <div class="placeholder-state" style="grid-column: 1 / -1;">
          <div class="placeholder-icon">🔍</div>
          <p>No results found for <strong>"${escapeHtml(keyword || category)}"</strong>.<br/>
          Try a different keyword or category.</p>
        </div>`;
      showStatus(`ℹ️ No articles found for "${keyword || category}". Try a different search.`, "info");
      return;
    }

    newsGrid.innerHTML = "";
    articles.forEach((article, i) => {
      newsGrid.appendChild(renderArticle(article, i));
    });

    const label = keyword ? `keyword: "${keyword}"` : `category: ${category}`;
    showStatus(
      `✅ ${articles.length} articles loaded for ${label}` +
      (articles.length < MIN_ARTICLES ? ` (fewer than ${MIN_ARTICLES} available)` : ""),
      "success"
    );

  } catch (err) {
    handleFetchError(err.message);
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.querySelector(".btn-text").textContent = "Fetch News";
  }
}

// ─────────────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────────────
function handleFetchError(message, statusCode = null) {
  newsGrid.innerHTML = `
    <div class="placeholder-state" style="grid-column: 1 / -1;">
      <div class="placeholder-icon">⚠️</div>
      <p><strong>Failed to load news.</strong><br/>${escapeHtml(message)}</p>
      <p style="margin-top:12px; font-size:13px; color:var(--text-muted);">
        ${getErrorHelp(statusCode)}
      </p>
    </div>`;

  let statusMsg = `❌ Error: ${message}`;
  if (statusCode === 401) statusMsg = "❌ Invalid API key.";
  if (statusCode === 429) statusMsg = "❌ Rate limit reached. Please wait before fetching again.";
  showStatus(statusMsg, "error");
}

function getErrorHelp(code) {
  const tips = {
    401: "The API key may be invalid or expired.",
    429: "Too many requests. Free-tier allows 100 requests/day.",
    426: "Upgrade required. Some endpoints require a paid plan.",
  };
  return tips[code] || "Check your internet connection and try again.";
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
categorySelect.addEventListener("change", () => {
  if (categorySelect.value) keywordInput.value = "";
});

keywordInput.addEventListener("input", () => {
  if (keywordInput.value.trim()) categorySelect.value = "";
});

keywordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fetchNews();
});
