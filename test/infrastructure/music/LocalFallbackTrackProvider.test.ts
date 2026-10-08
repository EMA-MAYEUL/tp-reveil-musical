import { describe, expect, it } from 'vitest';
import { WEATHER_TYPES } from '../../../src/domain/wakeUp.js';
import { LocalFallbackTrackProvider } from '../../../src/infrastructure/music/local/LocalFallbackTrackProvider.js';

describe('LocalFallbackTrackProvider', () => {
  it.each(WEATHER_TYPES)('always has a track for %s', (weather) => {
    const track = new LocalFallbackTrackProvider().pick(weather);

    expect(track.title).not.toBe('');
    expect(track.artist).not.toBe('');
  });
});
