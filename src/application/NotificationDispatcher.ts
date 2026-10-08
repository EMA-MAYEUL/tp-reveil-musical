import type { Channel, Contact, WakeUpMessage } from '../domain/wakeUp.js';
import { errorMessage } from './errorMessage.js';
import type { DeliveryChannel, Logger, Notifier } from './ports.js';

export interface Delivery {
  channel: DeliveryChannel;
  degraded: boolean;
}

interface Deps {
  notifiers: Notifier[];
  lastResortNotifier: Notifier;
  notificationFallbackOrder: Channel[];
  logger: Logger;
}

/**
 * Sends on the preferred channel, then on the fallback channels in configured order,
 * then on the last-resort notifier, so a broken channel never prevents the wake-up.
 */
export class NotificationDispatcher {
  private readonly notifiers: Map<DeliveryChannel, Notifier>;
  private readonly lastResort: Notifier;
  private readonly fallbackOrder: Channel[];
  private readonly logger: Logger;

  constructor({ notifiers, lastResortNotifier, notificationFallbackOrder, logger }: Deps) {
    this.notifiers = new Map(notifiers.map((notifier) => [notifier.channel, notifier]));
    this.lastResort = lastResortNotifier;
    this.fallbackOrder = notificationFallbackOrder;
    this.logger = logger;
  }

  async dispatch(preferred: Channel, contact: Contact, message: WakeUpMessage): Promise<Delivery> {
    for (const notifier of this.candidates(preferred)) {
      try {
        await notifier.notify(contact, message);
        return { channel: notifier.channel, degraded: notifier.channel !== preferred };
      } catch (error) {
        this.logger.warn(`${notifier.channel} channel failed: ${errorMessage(error)}`);
      }
    }
    await this.lastResort.notify(contact, message);
    return { channel: this.lastResort.channel, degraded: true };
  }

  private candidates(preferred: Channel): Notifier[] {
    const order = [preferred, ...this.fallbackOrder.filter((channel) => channel !== preferred)];
    return order.flatMap((channel) => this.notifiers.get(channel) ?? []);
  }
}
