import type { FallbackTrackProvider } from '../../../application/ports.js';
import type { Track, Weather } from '../../../domain/wakeUp.js';

// Hard-coded on purpose: this list is used when no provider is reachable.
const TRACKS_BY_WEATHER: Record<Weather, Track> = {
  SOLEIL: { title: 'Walking on Sunshine', artist: 'Katrina and the Waves' },
  PLUIE: { title: 'Singin’ in the Rain', artist: 'Gene Kelly' },
  NEIGE: { title: 'Let It Snow!', artist: 'Dean Martin' },
  NUAGEUX: { title: 'Mr. Blue Sky', artist: 'Electric Light Orchestra' },
};

export class LocalFallbackTrackProvider implements FallbackTrackProvider {
  pick(weather: Weather): Track {
    return TRACKS_BY_WEATHER[weather];
  }
}
