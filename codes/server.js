/**
 * NewsWire — Local Dev Server + NewsAPI Proxy
 * Laboratory Practical 2
 *
 * Run:  node server.js
 * Open: http://localhost:3000
 *
 * This server does two things:
 *  1. Serves the static frontend files (index.html, style.css, app.js)
 *  2. Proxies /api/news requests to NewsAPI.org so the browser
 *     never hits NewsAPI directly (fixes the "Developer plan" CORS block)
 */

const http  = require("http");
const https = require("https");
const fs    = require("fs");
const path  = require("path");
const url   = require("url");

// ── Config ──────────────────────────────────────────────
const PORT    = 3000;
const API_KEY = process.env.NEWS_API_KEY || ""; // set via env or entered in browser

// ── MIME types for static files ──────────────────────────
const MIME = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
};

// ── Helper: serve a static file ─────────────────────────
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || "text/plain";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

// ── Helper: proxy a request to NewsAPI ──────────────────
function proxyNewsAPI(res, queryString) {
  const parsed   = new URLSearchParams(queryString);
  const apiKey   = parsed.get("apiKey") || API_KEY;
  const category = parsed.get("category");
  const keyword  = parsed.get("q");

  if (!apiKey) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "API key is required." }));
    return;
  }

  // Build the upstream NewsAPI URL
  let upstreamPath;
  if (keyword) {
    upstreamPath = `/v2/everything?q=${encodeURIComponent(keyword)}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${apiKey}`;
  } else {
    const cat = category || "general";
    upstreamPath = `/v2/top-headlines?country=us&category=${cat}&pageSize=12&apiKey=${apiKey}`;
  }

  const options = {
    hostname: "newsapi.org",
    path:     upstreamPath,
    method:   "GET",
    headers:  { "User-Agent": "NewsWire-LabPractical/1.0" },
  };

  const req = https.request(options, (apiRes) => {
    let body = "";
    apiRes.on("data", (chunk) => { body += chunk; });
    apiRes.on("end", () => {
      res.writeHead(apiRes.statusCode, {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(body);
    });
  });

  req.on("error", (err) => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "error", message: "Upstream request failed: " + err.message }));
  });

  req.end();
}

// ── Main server ──────────────────────────────────────────
const server = http.createServer((req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Proxy endpoint: GET /api/news?...
  if (pathname === "/api/news") {
    proxyNewsAPI(res, parsed.search ? parsed.search.slice(1) : "");
    return;
  }

  // Static files
  let filePath = path.join(__dirname, pathname === "/" ? "index.html" : pathname);
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log("─────────────────────────────────────────");
  console.log(`  NewsWire server running!`);
  console.log(`  Open → http://localhost:${PORT}`);
  console.log("─────────────────────────────────────────");
  console.log(`  API proxy at /api/news`);
  console.log("  Press Ctrl+C to stop.");
});
