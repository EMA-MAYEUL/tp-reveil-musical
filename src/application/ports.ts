import type { Channel, Contact, Track, UserProfile, WakeUpMessage, Weather } from '../domain/wakeUp.js';

/** Internal user service (mocked in this TP). */
export interface UserProfileRepository {
  findById(userId: string): Promise<UserProfile | undefined>;
}

/** A source of tracks (iTunes, MusicBrainz...). Throws ProviderUnavailableError when the provider fails. */
export interface MusicCatalog {
  readonly name: string;
  findTrack(query: string): Promise<Track | undefined>;
}

/** Last-resort track source: must always return a track, never throw. */
export interface FallbackTrackProvider {
  pick(weather: Weather): Track;
}

export type DeliveryChannel = Channel | 'LOG';

/** A notification channel. Throws when the message cannot be delivered. */
export interface Notifier {
  readonly channel: DeliveryChannel;
  notify(contact: Contact, message: WakeUpMessage): Promise<void>;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
}

export interface Clock {
  now(): number;
}
