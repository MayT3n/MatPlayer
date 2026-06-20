import type { Track, SearchResult } from "@/lib/types";
import { cleanSongTitle, cleanArtistName } from "@/lib/normalize";
import {
  searchMusic,
  getStreams,
  getRelated,
  getVideoMeta as apiGetVideoMeta,
  parseDuration,
  type SearchItem,
} from "./api";

// ── Helpers ───────────────────────────────────────────────────

type LooseItem = {
  id?: string;
  videoId?: string;
  video_id?: string;
  title?: string;
  artist?: string;
  author?: string;
  uploader?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  duration?: number | string;
  lengthSeconds?: number | string;
  views?: number;
};

function pickId(item: LooseItem): string {
  return item.id || item.videoId || item.video_id || "";
}

function pickArtist(item: LooseItem): string {
  return item.artist || item.author || item.uploader || "";
}

function pickThumbnail(item: LooseItem, id: string): string {
  return (
    item.thumbnail ||
    item.thumbnails?.[0]?.url ||
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  );
}

function toSeconds(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return parseDuration(v);
  }
  return 0;
}

function normalizeToTrack(item: LooseItem): Track | null {
  const id = pickId(item);
  if (!id) return null;

  const rawTitle = (item.title || "").trim();
  const rawArtist = pickArtist(item).trim();

  return {
    id,
    title: cleanSongTitle(rawTitle) || rawTitle || "آهنگ",
    artist: cleanArtistName(rawArtist) || rawArtist || "",
    thumbnail: pickThumbnail(item, id),
    duration: toSeconds(item.duration ?? item.lengthSeconds),
    views: item.views,
  };
}

function dedupeTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>();
  const out: Track[] = [];

  for (const t of tracks) {
    if (!t?.id || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }

  return out;
}

// ── Search ────────────────────────────────────────────────────
export async function searchMusicTracks(query: string): Promise<SearchResult> {
  const items = await searchMusic(query);

  const tracks: Track[] = items
    .map((item: SearchItem) =>
      normalizeToTrack({
        id: item.id,
        title: item.title,
        artist: item.artist,
        thumbnail: item.thumbnail,
        duration: item.duration,
        views: item.views,
      })
    )
    .filter((t): t is Track => Boolean(t));

  return { items: dedupeTracks(tracks) };
}

export { searchMusic, getStreams };
export const getVideoMeta = apiGetVideoMeta;

// ── Related tracks → auto playlist from the current song ──────
export async function getRelatedTracks(videoId: string): Promise<Track[]> {
  // 1) try native related endpoint
  try {
    const related = await getRelated(videoId);

    console.log("[providers] raw related:", related);

    const normalized = dedupeTracks(
      (Array.isArray(related) ? related : [])
        .map((r) => normalizeToTrack(r as LooseItem))
        .filter((t): t is Track => Boolean(t))
        .filter((t) => t.id !== videoId)
    );

    console.log("[providers] normalized related:", normalized.length);

    if (normalized.length > 0) {
      return normalized.slice(0, 25);
    }
  } catch (err) {
    console.error("[providers] getRelated failed:", err);
  }

  // 2) fallback: use metadata + search
  try {
    const meta = await apiGetVideoMeta(videoId);

    if (!meta) {
      console.warn("[providers] no metadata for fallback related");
      return [];
    }

    const cleanTitle = cleanSongTitle(meta.title || "");
    const cleanArtist = cleanArtistName(meta.artist || "");

    const queries = [
      [cleanArtist, cleanTitle].filter(Boolean).join(" ").trim(),
      cleanTitle,
    ].filter(Boolean);

    let fallbackTracks: Track[] = [];

    for (const q of queries) {
      if (!q) continue;

      const results = await searchMusic(q);

      const normalized = dedupeTracks(
        (Array.isArray(results) ? results : [])
          .map((r: SearchItem) =>
            normalizeToTrack({
              id: r.id,
              title: r.title,
              artist: r.artist,
              thumbnail: r.thumbnail,
              duration: r.duration,
              views: r.views,
            })
          )
          .filter((t): t is Track => Boolean(t))
          .filter((t) => t.id !== videoId)
      );

      if (normalized.length > 0) {
        fallbackTracks = normalized;
        break;
      }
    }

    console.log("[providers] fallback related:", fallbackTracks.length);

    return fallbackTracks.slice(0, 25);
  } catch (err) {
    console.error("[providers] fallback related failed:", err);
    return [];
  }
}

// ── Get full track info (metadata) ───────────────────────────
export async function getTrackInfo(id: string): Promise<Track> {
  const stream = await getStreams(id);
  if (stream && stream.title) {
    return {
      id,
      title: cleanSongTitle(stream.title) || stream.title,
      artist: cleanArtistName(stream.uploader ?? "") || stream.uploader || "",
      thumbnail:
        stream.thumbnailUrl ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: typeof stream.duration === "number" ? stream.duration : 0,
    };
  }

  const meta = await apiGetVideoMeta(id);
  if (meta) {
    return {
      id,
      title: cleanSongTitle(meta.title) || meta.title || "آهنگ",
      artist: cleanArtistName(meta.artist) || meta.artist || "",
      thumbnail: meta.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: meta.duration || 0,
    };
  }

  return {
    id,
    title: "آهنگ",
    artist: "",
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: 0,
  };
}