// MusicBrainz recording search payload. Only MusicBrainzMusicCatalog may import this file.
export interface MusicBrainzSearchResponse {
  recordings: MusicBrainzRecordingDto[];
}

export interface MusicBrainzRecordingDto {
  title?: string;
  'artist-credit'?: { name: string; joinphrase?: string }[];
}
