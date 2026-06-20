import type { Track } from "./types";

const KEY = "mp_recent";
const MAX = 12;

export function getRecentlyPlayed(): Track[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentlyPlayed(track: Track) {
  if (!track?.id) return;
  try {
    const list = getRecentlyPlayed().filter((t) => t.id !== track.id);
    list.unshift({
      id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
    });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore quota */
  }
}
