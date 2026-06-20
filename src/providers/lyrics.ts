// lyrics-service.ts
// این فایل را کپی کن، هیچ importای لازم ندارد

export interface LyricLine {
  time: number;
  text: string;
  fa?: boolean;
}

export interface LyricsResult {
  lines: LyricLine[];
  synced: boolean;
  confidence: number;
}

const BASE_URL = "https://lrclib.net/api";
const RTL_REGEX = /[\u0590-\u08FF]/;

// ========== SAFE HELPERS ==========

function safe(str: string | null | undefined, maxLen = 100): string {
  if (!str) return "";
  return String(str).slice(0, maxLen).toLowerCase().trim();
}

function normalize(str: string): string {
  return safe(str, 100)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // حذف accent
    .replace(/[^\w\s\u0600-\u06FF]/g, " "); // فقط حروف و اعداد و فارسی
}

// مقایسه ساده و سریع (بدون ماتریس)
function quickScore(a: string, b: string): number {
  const A = normalize(a);
  const B = normalize(b);
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.9;
  
  // شمارش کلمات مشترک
  const wordsA = new Set(A.split(/\s+/));
  const wordsB = B.split(/\s+/);
  const common = wordsB.filter(w => wordsA.has(w)).length;
  return common / Math.max(wordsA.size, wordsB.size);
}

function parseLRC(lrc: string): LyricLine[] {
  if (!lrc || typeof lrc !== "string") return [];
  
  const lines: LyricLine[] = [];
  const seen = new Set<string>();
  
  for (const raw of lrc.split("\n").slice(0, 2000)) {
    const matches = [...raw.matchAll(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
    if (!matches.length) continue;
    
    const text = raw.replace(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g, "").trim();
    if (!text) continue;
    
    for (const m of matches) {
      const time = parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseInt(m[3].padEnd(3, "0").slice(0,3)) / 1000 : 0);
      const key = `${time.toFixed(2)}-${text.slice(0, 50)}`;
      if (!seen.has(key)) {
        seen.add(key);
        lines.push({ time, text, fa: RTL_REGEX.test(text) });
      }
    }
  }
  
  return lines.sort((a, b) => a.time - b.time);
}

function parsePlain(text: string): LyricLine[] {
  if (!text || typeof text !== "string") return [];
  return text
    .split("\n")
    .slice(0, 500)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => ({ time: -1, text: l, fa: RTL_REGEX.test(l) }));
}

// ========== MAIN FUNCTION ==========

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
  signal?: AbortSignal
): Promise<LyricsResult | null> {
  
  try {
    const cleanTitle = safe(title, 80);
    const cleanArtist = safe(artist, 50);
    
    if (!cleanTitle) return null;

    // 1. Exact match
    if (cleanArtist && duration) {
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist,
        duration: Math.round(duration).toString()
      });
      
      const res = await fetch(`${BASE_URL}/get?${params}`, { signal });
      if (res.ok) {
        const data = await res.json();
        if (data?.syncedLyrics) {
          const lines = parseLRC(data.syncedLyrics);
          if (lines.length) return { lines, synced: true, confidence: 1 };
        }
        if (data?.plainLyrics) {
          const lines = parsePlain(data.plainLyrics);
          if (lines.length) return { lines, synced: false, confidence: 0.8 };
        }
      }
    }

    // 2. Search
    const params = new URLSearchParams({ track_name: cleanTitle });
    if (cleanArtist) params.set("artist_name", cleanArtist);
    
    const res = await fetch(`${BASE_URL}/search?${params}`, { signal });
    if (!res.ok) return null;
    
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return null;

    // Score and filter
    const candidates = items
      .map((item: any) => ({
        item,
        score: quickScore(item.trackName, cleanTitle) * 0.6 + 
               quickScore(item.artistName, cleanArtist) * 0.4,
        durationDiff: duration && item.duration ? Math.abs(item.duration - duration) : 0
      }))
      .filter((c: any) => {
        if (c.score < 0.5) return false; // حداقل ۵۰٪ شباهت
        if (duration && c.durationDiff > 10) return false; // اختلاف بیش از ۱۰ ثانیه
        return true;
      })
      .sort((a: any, b: any) => b.score - a.score);

    const best = candidates[0];
    if (!best) return null;

    // Prefer synced
    const lines = best.item.syncedLyrics 
      ? parseLRC(best.item.syncedLyrics)
      : parsePlain(best.item.plainLyrics || "");
      
    if (!lines.length) return null;

    return {
      lines,
      synced: !!best.item.syncedLyrics,
      confidence: best.score
    };

  } catch (err) {
    // هر خطایی بود، ساکت null برمی‌گردانیم که صفحه crash نکند
    if (err instanceof Error && err.name === "AbortError") throw err;
    console.error("Lyrics fetch error:", err);
    return null;
  }
}