const arabicToPersianMap: Record<string, string> = {
  ك: "ک",
  ي: "ی",
  "٤": "۴",
  "٥": "۵",
  "٦": "۶",
  ة: "ه",
  ؤ: "و",
  إ: "ا",
  أ: "ا",
  آ: "ا",
};

export function normalizePersian(text: string): string {
  let result = text;
  for (const [arabic, persian] of Object.entries(arabicToPersianMap)) {
    result = result.replace(new RegExp(arabic, "g"), persian);
  }
  return result;
}

export function normalizeQuery(query: string): string {
  let q = query.trim();
  q = normalizePersian(q);
  q = q.replace(/\s+/g, " ");
  q = q.toLowerCase();
  return q;
}

export function extractVideoId(url: string): string {
  if (url.includes("watch?v=")) {
    return url.split("watch?v=")[1].split("&")[0];
  }
  if (url.startsWith("/watch?v=")) {
    return url.split("v=")[1].split("&")[0];
  }
  return url;
}

// Strip YouTube noise so the real song name shows in the title
export function cleanSongTitle(title?: string): string {
  if (!title) return "آهنگ";
  let t = title;
  // remove bracketed noise: (Official Video), [Lyrics], (4K), (Audio)...
  t = t.replace(
    /[([](?:[^)\]]*?)(?:official|lyric[s]?|audio|video|music\s*video|hd|4k|hq|mv|visualizer|remaster(?:ed)?|explicit|prod[^)\]]*)(?:[^)\]]*?)[)\]]/gi,
    ""
  );
  // remove leftover bare keywords
  t = t.replace(
    /\b(?:official\s*(?:music\s*)?video|official\s*audio|lyric[s]?\s*video|music\s*video|visualizer|official)\b/gi,
    ""
  );
  // trailing separators / pipes
  t = t.replace(/\s*[|｜]\s*$/g, "");
  t = t.replace(/\s{2,}/g, " ").replace(/\s*[-–—]\s*$/g, "").trim();
  return t || "آهنگ";
}

export function cleanArtistName(artist?: string): string {
  if (!artist) return "";
  return artist
    .replace(/\b(?:vevo|official|topic|music|records|channel)\b/gi, "")
    .replace(/\s*[-–—]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function formatViews(n?: number): string {
  if (!n || n <= 0) return "";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B بازدید`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M بازدید`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K بازدید`;
  return `${n} بازدید`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
