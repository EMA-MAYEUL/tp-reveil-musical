// Composition root: the only module that knows the concrete implementations.
// The container builds every object (asClass/asFunction), so no `new` is written for any implementation.
import { asClass, asFunction, asValue, createContainer, InjectionMode, type AwilixContainer, type Constructor } from 'awilix';
import { NotificationDispatcher } from './application/NotificationDispatcher.js';
import type { MusicCatalog } from './application/ports.js';
import { TrackResolver } from './application/TrackResolver.js';
import { WakeUpService } from './application/WakeUpService.js';
import type { AppConfig } from './config.js';
import { ConsoleLogger, SystemClock } from './infrastructure/system.js';
import { CachedMusicCatalog } from './infrastructure/music/CachedMusicCatalog.js';
import { ItunesMusicCatalog } from './infrastructure/music/itunes/ItunesMusicCatalog.js';
import { LocalFallbackTrackProvider } from './infrastructure/music/local/LocalFallbackTrackProvider.js';
import { MusicBrainzMusicCatalog } from './infrastructure/music/musicbrainz/MusicBrainzMusicCatalog.js';
import { EmailNotifier, LogNotifier, PushNotifier, SmsNotifier } from './infrastructure/notification/notifiers.js';
import {
  ConsoleOutputSink,
  SimulatedEmailSdk,
  SimulatedPushService,
  SimulatedSmsGateway,
} from './infrastructure/notification/sdk/simulatedSdks.js';
import { InMemoryUserProfileRepository } from './infrastructure/users/InMemoryUserProfileRepository.js';
import { SEED_PROFILES } from './infrastructure/users/seedProfiles.js';

/** Available music providers. Adding one = writing its adapter and adding one line here. */
const MUSIC_PROVIDERS: Record<string, Constructor<MusicCatalog>> = {
  itunes: ItunesMusicCatalog,
  musicbrainz: MusicBrainzMusicCatalog,
};

/** What the outside world (HTTP layer, tests) may resolve from the container. */
export interface AppCradle {
  wakeUpService: WakeUpService;
}

export function buildContainer(config: AppConfig): AwilixContainer<AppCradle> {
  const unknown = config.musicProviders.filter((name) => !(name in MUSIC_PROVIDERS));
  if (unknown.length > 0) {
    throw new Error(`Unknown music provider(s): ${unknown.join(', ')}. Available: ${Object.keys(MUSIC_PROVIDERS).join(', ')}`);
  }

  const container = createContainer<AppCradle>({ injectionMode: InjectionMode.PROXY, strict: true });

  container.register({
    // Configuration and technical primitives
    httpFetch: asValue(globalThis.fetch),
    itunesConfig: asValue(config.itunes),
    musicBrainzConfig: asValue(config.musicBrainz),
    musicCacheTtlMs: asValue(config.musicCacheTtlMs),
    notificationFallbackOrder: asValue(config.notificationFallbackOrder),
    simulatedOutages: asValue(config.simulatedOutages),
    seedProfiles: asValue(SEED_PROFILES),
    clock: asClass(SystemClock).singleton(),
    logger: asClass(ConsoleLogger).singleton(),
    outputSink: asClass(ConsoleOutputSink).singleton(),

    // Music: each configured provider is wrapped in a cache, then chained by the TrackResolver
    musicCatalogs: asFunction((cradle: Record<string, MusicCatalog>) =>
      config.musicProviders.map((name) => cradle[`${name}MusicCatalog`]),
    ).singleton(),
    fallbackTrackProvider: asClass(LocalFallbackTrackProvider).singleton(),
    trackResolver: asClass(TrackResolver).singleton(),

    // Notification: SDKs, their adapters, and the dispatcher
    emailSdk: asClass(SimulatedEmailSdk).singleton(),
    smsGateway: asClass(SimulatedSmsGateway).singleton(),
    pushService: asClass(SimulatedPushService).singleton(),
    notifiers: asFunction(({ emailNotifier, smsNotifier, pushNotifier }) => [emailNotifier, smsNotifier, pushNotifier]).singleton(),
    emailNotifier: asClass(EmailNotifier).singleton(),
    smsNotifier: asClass(SmsNotifier).singleton(),
    pushNotifier: asClass(PushNotifier).singleton(),
    lastResortNotifier: asClass(LogNotifier).singleton(),
    notificationDispatcher: asClass(NotificationDispatcher).singleton(),

    // Use case
    userProfileRepository: asClass(InMemoryUserProfileRepository).singleton(),
    wakeUpService: asClass(WakeUpService).singleton(),
  });

  for (const [name, catalogClass] of Object.entries(MUSIC_PROVIDERS)) {
    container.register({
      [`${name}RawCatalog`]: asClass(catalogClass).singleton(),
      [`${name}MusicCatalog`]: asClass(CachedMusicCatalog)
        .inject((c) => ({ inner: c.resolve(`${name}RawCatalog`) }))
        .singleton(),
    });
  }

  return container;
}
