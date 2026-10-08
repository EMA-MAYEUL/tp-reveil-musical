import { UnknownUserError } from '../domain/errors.js';
import { buildWakeUpMessage, type Track, type WakeUpRequest } from '../domain/wakeUp.js';
import type { NotificationDispatcher } from './NotificationDispatcher.js';
import type { DeliveryChannel, UserProfileRepository } from './ports.js';
import type { TrackResolver } from './TrackResolver.js';

export interface WakeUpResult {
  userId: string;
  track: Track;
  musicSource: string;
  channel: DeliveryChannel;
  degraded: { music: boolean; notification: boolean };
}

interface Deps {
  userProfileRepository: UserProfileRepository;
  trackResolver: TrackResolver;
  notificationDispatcher: NotificationDispatcher;
}

export class WakeUpService {
  private readonly users: UserProfileRepository;
  private readonly trackResolver: TrackResolver;
  private readonly dispatcher: NotificationDispatcher;

  constructor({ userProfileRepository, trackResolver, notificationDispatcher }: Deps) {
    this.users = userProfileRepository;
    this.trackResolver = trackResolver;
    this.dispatcher = notificationDispatcher;
  }

  async wakeUp(request: WakeUpRequest): Promise<WakeUpResult> {
    const profile = await this.users.findById(request.userId);
    if (!profile) {
      throw new UnknownUserError(request.userId);
    }

    const query = profile.tracksByWeather[request.weather] ?? profile.fallbackTrack;
    const resolved = await this.trackResolver.resolve(query, request.weather);
    const message = buildWakeUpMessage(request.dayOfWeek, resolved.track);
    const delivery = await this.dispatcher.dispatch(profile.preferredChannel, profile.contact, message);

    return {
      userId: profile.userId,
      track: resolved.track,
      musicSource: resolved.source,
      channel: delivery.channel,
      degraded: { music: resolved.degraded, notification: delivery.degraded },
    };
  }
}
