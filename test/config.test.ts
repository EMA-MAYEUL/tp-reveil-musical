import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('has working defaults', () => {
    const config = loadConfig({});

    expect(config.musicProviders).toEqual(['itunes', 'musicbrainz']);
    expect(config.notificationFallbackOrder).toEqual(['EMAIL', 'PUSH', 'SMS']);
    expect(config.simulatedOutages).toEqual([]);
    expect(config.musicBrainz.userAgent).toMatch(/^tp-reveil-musical\/1\.0 \(/);
  });

  it('reads providers, channels and numbers from the environment', () => {
    const config = loadConfig({
      MUSIC_PROVIDERS: ' musicbrainz , itunes ',
      NOTIFICATION_FALLBACK: 'push,email',
      PROVIDER_TIMEOUT_MS: '500',
      PORT: '8080',
    });

    expect(config.musicProviders).toEqual(['musicbrainz', 'itunes']);
    expect(config.notificationFallbackOrder).toEqual(['PUSH', 'EMAIL']);
    expect(config.itunes.timeoutMs).toBe(500);
    expect(config.port).toBe(8080);
  });

  it('rejects an unknown channel', () => {
    expect(() => loadConfig({ NOTIFICATION_FALLBACK: 'FAX' })).toThrow(/Unknown notification channel/);
  });

  it('rejects an invalid number', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/Invalid number/);
  });
});
