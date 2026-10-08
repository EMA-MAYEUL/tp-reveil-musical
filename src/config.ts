import { CHANNELS, type Channel } from './domain/wakeUp.js';
import type { ItunesConfig } from './infrastructure/music/itunes/ItunesMusicCatalog.js';
import type { MusicBrainzConfig } from './infrastructure/music/musicbrainz/MusicBrainzMusicCatalog.js';

export interface AppConfig {
  port: number;
  /** Music providers tried in this order, before the local fallback list. */
  musicProviders: string[];
  musicCacheTtlMs: number;
  itunes: ItunesConfig;
  musicBrainz: MusicBrainzConfig;
  /** Channels tried after the user's preferred one, in this order, before the last-resort log. */
  notificationFallbackOrder: Channel[];
  simulatedOutages: Channel[];
}

type Env = Record<string, string | undefined>;

/** The only place that reads environment variables. Changing a provider never requires a rebuild. */
export function loadConfig(env: Env): AppConfig {
  const timeoutMs = toNumber(env.PROVIDER_TIMEOUT_MS, 3000);
  return {
    port: toNumber(env.PORT, 3000),
    musicProviders: toList(env.MUSIC_PROVIDERS ?? 'itunes,musicbrainz'),
    musicCacheTtlMs: toNumber(env.MUSIC_CACHE_TTL_MS, 10 * 60_000),
    itunes: { baseUrl: env.ITUNES_BASE_URL ?? 'https://itunes.apple.com', timeoutMs },
    musicBrainz: {
      baseUrl: env.MUSICBRAINZ_BASE_URL ?? 'https://musicbrainz.org',
      timeoutMs,
      userAgent: env.MUSICBRAINZ_USER_AGENT ?? 'tp-reveil-musical/1.0 ( https://github.com/EMA-MAYEUL/tp-reveil-musical )',
    },
    notificationFallbackOrder: toChannels(env.NOTIFICATION_FALLBACK ?? 'EMAIL,PUSH,SMS'),
    simulatedOutages: toChannels(env.SIMULATED_OUTAGES ?? ''),
  };
}

function toList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function toChannels(value: string): Channel[] {
  const channels = toList(value.toUpperCase());
  const unknown = channels.filter((channel) => !CHANNELS.includes(channel as Channel));
  if (unknown.length > 0) {
    throw new Error(`Unknown notification channel(s): ${unknown.join(', ')}`);
  }
  return channels as Channel[];
}

function toNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid number in configuration: "${value}"`);
  }
  return parsed;
}
