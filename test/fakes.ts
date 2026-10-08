import type {
  DeliveryChannel,
  FallbackTrackProvider,
  Logger,
  MusicCatalog,
  Notifier,
  UserProfileRepository,
} from '../src/application/ports.js';
import type { Contact, Track, UserProfile, WakeUpMessage } from '../src/domain/wakeUp.js';

export const ALICE: UserProfile = {
  userId: 'alice',
  tracksByWeather: { SOLEIL: 'Here Comes the Sun', PLUIE: 'Riders on the Storm' },
  fallbackTrack: 'Wake Me Up',
  preferredChannel: 'SMS',
  contact: { email: 'alice@example.com', phone: '+33600000000', pushToken: 'token-alice' },
};

export function fakeUserProfileRepository(profiles: UserProfile[] = [ALICE]): UserProfileRepository {
  return { findById: async (userId) => profiles.find((profile) => profile.userId === userId) };
}

/** Catalog that answers every query with "<query> - <artist>", or throws / returns nothing on demand. */
export function fakeMusicCatalog(
  name: string,
  behavior: 'ok' | 'empty' | 'fail' = 'ok',
): MusicCatalog & { queries: string[] } {
  const queries: string[] = [];
  return {
    name,
    queries,
    findTrack: async (query) => {
      queries.push(query);
      if (behavior === 'fail') throw new Error(`${name} is down`);
      if (behavior === 'empty') return undefined;
      return { title: query, artist: `${name} artist` };
    },
  };
}

export const FALLBACK_TRACK: Track = { title: 'Fallback song', artist: 'Local artist' };

export function fakeFallbackTrackProvider(): FallbackTrackProvider {
  return { pick: () => FALLBACK_TRACK };
}

export interface SentNotification {
  contact: Contact;
  message: WakeUpMessage;
}

export function fakeNotifier(channel: DeliveryChannel, fails = false): Notifier & { sent: SentNotification[] } {
  const sent: SentNotification[] = [];
  return {
    channel,
    sent,
    notify: async (contact, message) => {
      if (fails) throw new Error(`${channel} is down`);
      sent.push({ contact, message });
    },
  };
}

export function fakeLogger(): Logger & { warnings: string[] } {
  const warnings: string[] = [];
  return { warnings, info: () => {}, warn: (message) => warnings.push(message) };
}
