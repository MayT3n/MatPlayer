/**
 * Mat Player — Cloudflare Worker Backend (YouTube direct, no API key)
 *
 * چرا بازنویسی شد؟ instanceهای عمومی Piped عملاً از کار افتاده‌اند، پس
 * این Worker مستقیماً صفحهٔ نتایج/تماشای یوتیوب را می‌خواند و نرمال‌سازی می‌کند.
 * نتیجه: سرچ پایدار + ویوی واقعی + متادیتای تمیز + پلی‌لیست خودکار.
 *
 * Deploy:
 *   dash.cloudflare.com → Workers & Pages → Create Worker → این فایل را paste و Deploy کن
 *   سپس URL را در src/config/api.ts بگذار.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
};

const YT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  // bypass EU consent interstitial
  Cookie: "CONSENT=YES+1; SOCS=CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

function idFromUrl(u) {
  if (!u) return "";
  if (u.includes("watch?v=")) return u.split("watch?v=")[1].split("&")[0];
  if (u.includes("/shorts/")) return u.split("/shorts/")[1].split(/[?&]/)[0];
  return u.replace(/^\//, "");
}
function fmt(sec) {
  if (!sec || sec < 0) return "";
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
function runsText(o) {
  if (!o) return "";
  if (o.simpleText) return o.simpleText;
  if (Array.isArray(o.runs)) return o.runs.map((r) => r.text).join("");
  return "";
}
function parseViews(txt) {
  if (!txt) return 0;
  const n = txt.replace(/[^\d]/g, "");
  return n ? parseInt(n, 10) : 0;
}
function durToSec(txt) {
  if (!txt) return 0;
  const p = txt.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return Number(txt) || 0;
}

function extractInitialData(html) {
  let m = html.match(/var ytInitialData\s*=\s*(\{.+?\});<\/script>/s);
  if (!m) m = html.match(/ytInitialData"\]\s*=\s*(\{.+?\});/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

// targeted traversal (cheap) — collect videoRenderer items from search results
function collectSearchItems(data) {
  const out = [];
  try {
    const sections =
      data.contents.twoColumnSearchResultsRenderer.primaryContents
        .sectionListRenderer.contents;
    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const it of items) {
        const vr = it.videoRenderer;
        if (!vr || !vr.videoId) continue;
        const id = vr.videoId;
        const len = vr.lengthText?.simpleText; // missing => live/short, skip
        if (!len) continue;
        const thumbs = vr.thumbnail?.thumbnails || [];
        out.push({
          id,
          title: runsText(vr.title),
          artist: runsText(vr.ownerText) || runsText(vr.longBylineText),
          thumbnail:
            (thumbs[thumbs.length - 1]?.url || "").split("?")[0] ||
            `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
          duration: len,
          views: parseViews(runsText(vr.viewCountText) || vr.shortViewCountText?.simpleText),
        });
      }
    }
  } catch (e) { /* shape changed */ }
  // dedupe by id
  const seen = new Set();
  return out.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
}

async function ytSearch(query) {
  // sp=EgIQAQ%3D%3D → "Videos" filter
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=en&gl=US&sp=EgIQAQ%3D%3D`;
  const res = await fetch(url, { headers: YT_HEADERS, cf: { cacheTtl: 300 } });
  if (!res.ok) return [];
  const html = await res.text();
  const data = extractInitialData(html);
  if (!data) return [];
  return collectSearchItems(data);
}

function extractPlayerResponse(html) {
  let m = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});<\/script>/s);
  if (!m) m = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

async function ytMeta(id) {
  const url = `https://www.youtube.com/watch?v=${id}&hl=en&gl=US`;
  const res = await fetch(url, { headers: YT_HEADERS, cf: { cacheTtl: 600 } });
  if (!res.ok) return null;
  const html = await res.text();
  const pr = extractPlayerResponse(html);
  const vd = pr?.videoDetails;
  if (!vd) return null;
  return {
    title: vd.title,
    author: vd.author,
    lengthSeconds: parseInt(vd.lengthSeconds || "0", 10),
    thumbnail:
      vd.thumbnail?.thumbnails?.slice(-1)[0]?.url?.split("?")[0] ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

// Resolve a pasted link (YouTube / YT Music / Spotify / Apple Music)
function ytIdFromLink(link) {
  try {
    const u = new URL(link);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be") return u.pathname.slice(1).split("/")[0];
    if (h.endsWith("youtube.com") || h === "music.youtube.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const sh = u.pathname.match(/\/(shorts|embed)\/([\w-]{11})/);
      if (sh) return sh[2];
    }
  } catch {}
  return null;
}

async function resolveLink(link) {
  // 1) YouTube family → direct id
  const id = ytIdFromLink(link);
  if (id) return { type: "youtube", id };

  let host = "";
  try { host = new URL(link).hostname.replace(/^www\./, ""); } catch { return { error: "لینک نامعتبر" }; }

  // 2) Spotify → oEmbed title
  if (host.includes("spotify.com")) {
    try {
      const r = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`, { cf: { cacheTtl: 3600 } });
      if (r.ok) {
        const d = await r.json();
        const title = (d.title || "").replace(/^Spotify Embed:\s*/i, "").trim();
        if (title) return { type: "search", query: title, source: "spotify" };
      }
    } catch {}
    return { error: "نشد از اسپاتیفای استخراج کنم" };
  }

  // 3) Apple Music → page <title>
  if (host.includes("music.apple.com") || host.includes("itunes.apple.com")) {
    try {
      const r = await fetch(link, { headers: YT_HEADERS, cf: { cacheTtl: 3600 } });
      if (r.ok) {
        const html = await r.text();
        const m = html.match(/<title>(.*?)<\/title>/i);
        if (m) {
          // "Song Name - Song by Artist - Apple Music"
          let t = m[1].replace(/\s*[–-]\s*Apple\s*Music.*$/i, "");
          t = t.replace(/\s*[–-]\s*Song by\s*/i, " ").replace(/\u200e/g, "").trim();
          if (t) return { type: "search", query: t, source: "apple" };
        }
      }
    } catch {}
    return { error: "نشد از اپل‌موزیک استخراج کنم" };
  }

  return { error: "این لینک پشتیبانی نمی‌شه" };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      // ── Search ──
      if (path === "/search" || path === "/") {
        const q = url.searchParams.get("q");
        if (!q) return json({ items: [] });
        const items = await ytSearch(q);
        return json({ items });
      }

      // ── Streams: metadata + auto-playlist (related via artist search) ──
      if (path.startsWith("/streams/")) {
        const id = path.replace("/streams/", "").split(/[?&]/)[0];
        if (!id) return json({ error: "Missing id" }, 400);
        const meta = await ytMeta(id);
        if (!meta) return json({ error: "Not found" }, 404);

        // related = search by artist (fallback: title) minus current id
        const seedRaw = meta.author?.replace(/\s*-\s*Topic$/i, "") || meta.title || "";
        const seed = seedRaw.trim() || meta.title;
        let related = [];
        if (seed) {
          const r = await ytSearch(seed);
          related = r
            .filter((x) => x.id !== id)
            .slice(0, 20)
            .map((x) => ({
              id: x.id,
              title: x.title,
              artist: x.artist,
              thumbnail: x.thumbnail,
              duration: durToSec(x.duration),
            }));
        }
        return json({
          title: meta.title,
          uploader: meta.author,
          thumbnailUrl: meta.thumbnail,
          duration: meta.lengthSeconds,
          related,
        });
      }

      // ── Lightweight metadata only ──
      if (path.startsWith("/meta/")) {
        const id = path.replace("/meta/", "").split(/[?&]/)[0];
        const meta = await ytMeta(id);
        if (!meta) return json({ error: "Not found" }, 404);
        return json(meta);
      }

      // ── Resolve a pasted link (YouTube / Spotify / Apple Music) ──
      if (path === "/resolve") {
        const link = url.searchParams.get("url");
        if (!link) return json({ error: "Missing url" }, 400);
        return json(await resolveLink(link));
      }

      if (path === "/health") return json({ status: "ok", engine: "youtube-scrape" });

      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
