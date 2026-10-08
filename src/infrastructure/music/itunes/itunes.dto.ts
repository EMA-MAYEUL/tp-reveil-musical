// iTunes Search API payload. Only ItunesMusicCatalog may import this file.
export interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrackDto[];
}

export interface ItunesTrackDto {
  trackName?: string;
  artistName?: string;
  trackViewUrl?: string;
}
