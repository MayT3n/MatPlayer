import { API_BASE_URL } from "@/config/api";

export interface SearchItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string; // "4:30" format
  views?: number;
}

export function parseDuration(text?: string | number): number {
  if (text === undefined || text === null) return 0;
  if (typeof text === "number") return text;
  if (/^\d+$/.test(text)) return Number(text);
  const parts = text.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(text) || 0;
}

function fixThumbnail(url: string, id: string): string {
  if (!url) return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http://")) return url.replace("http://", "https://");
  return url;
}

// ── Search (via Cloudflare Worker → Piped) ────────────────────
export async function searchMusic(query: string): Promise<SearchItem[]> {
  try {
    console.log(`[API] Fetching from Worker: ${API_BASE_URL}/search?q=${query}`);
    const res = await fetch(
      `${API_BASE_URL}/search?q=${encodeURIComponent(query)}`
    );
    const data = await res.json();

    if (data.items && Array.isArray(data.items)) {
      const items: SearchItem[] = data.items
        .filter((i: SearchItem) => i && i.id && i.title)
        .map((i: SearchItem) => ({
          id: i.id,
          title: i.title,
          artist: i.artist || "ناشناس",
          thumbnail: fixThumbnail(i.thumbnail, i.id),
          duration: i.duration || "",
          views: typeof i.views === "number" ? i.views : 0,
        }));
      console.log(`✅ Found ${items.length} tracks`);
      return items;
    }
    return [];
  } catch (err) {
    console.error("[API] Failed:", err);
    return [];
  }
}

// ── Stream info (metadata + related, for the auto playlist) ────
export interface RelatedStream {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration: number;
}

export interface StreamInfo {
  title?: string;
  uploader?: string;
  thumbnailUrl?: string;
  duration?: number;
  related?: RelatedStream[];
}

export async function getStreams(videoId: string): Promise<StreamInfo | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/streams/${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (!data.title && !data.related)) return null;
    return data as StreamInfo;
  } catch {
    return null;
  }
}

// Related tracks for "build a playlist from the current song"
export async function getRelated(videoId: string): Promise<RelatedStream[]> {
  const info = await getStreams(videoId);
  return info?.related ?? [];
}

// Resolve a pasted link (YouTube / YT Music / Spotify / Apple Music)
export interface ResolveResult {
  type?: "youtube" | "search";
  id?: string;
  query?: string;
  source?: string;
  error?: string;
}
export async function resolveLink(link: string): Promise<ResolveResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/resolve?url=${encodeURIComponent(link)}`);
    if (!res.ok) return { error: "خطا در پردازش لینک" };
    return (await res.json()) as ResolveResult;
  } catch {
    return { error: "اتصال برقرار نشد" };
  }
}

// ── Light metadata (title / artist / cover): Worker first, noembed fallback ──
export async function getVideoMeta(videoId: string): Promise<{
  title: string;
  artist: string;
  thumbnail: string;
} | null> {
  // 1) Worker /meta (YouTube scrape — reliable)
  try {
    const res = await fetch(`${API_BASE_URL}/meta/${videoId}`);
    if (res.ok) {
      const d = await res.json();
      if (d && d.title) {
        return {
          title: d.title,
          artist: d.author ?? "",
          thumbnail:
            d.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    }
  } catch {
    /* fall through */
  }
  // 2) noembed fallback
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
    );
    if (!res.ok) return null;
    const d = await res.json();
    if (d.error) return null;
    return {
      title: d.title ?? "آهنگ",
      artist: d.author_name ?? "",
      thumbnail:
        d.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}
