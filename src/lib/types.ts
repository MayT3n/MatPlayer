export interface Track {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl?: string;
  duration?: number;
  views?: number;
}

export interface SearchResult {
  items: Track[];
  nextpage?: string;
}

export interface StreamInfo {
  audioStreams: AudioStream[];
  title: string;
  uploader: string;
  thumbnailUrl: string;
  duration: number;
  relatedStreams: RelatedStream[];
}

export interface AudioStream {
  url: string;
  bitrate: number;
  codec: string;
  format: string;
  mimeType: string;
  quality: string;
}

export interface RelatedStream {
  url: string;
  title: string;
  thumbnail: string;
  uploaderName: string;
  duration: number;
}

export interface MusicProvider {
  name: string;
  search(query: string): Promise<SearchResult>;
  getTrack(id: string): Promise<Track>;
  getStream(id: string): Promise<string | null>;
}
