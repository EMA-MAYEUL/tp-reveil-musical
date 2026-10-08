import { describe, expect, it } from 'vitest';
import { NotificationDispatcher } from '../../src/application/NotificationDispatcher.js';
import type { Notifier } from '../../src/application/ports.js';
import type { Channel } from '../../src/domain/wakeUp.js';
import { ALICE, fakeLogger, fakeNotifier } from '../fakes.js';

const MESSAGE = { subject: 'Réveil musical', body: 'Debout !' };

function dispatcherWith(notifiers: Notifier[], lastResort = fakeNotifier('LOG'), order: Channel[] = ['EMAIL', 'SMS', 'PUSH']) {
  return new NotificationDispatcher({
    notifiers,
    lastResortNotifier: lastResort,
    notificationFallbackOrder: order,
    logger: fakeLogger(),
  });
}

describe('NotificationDispatcher', () => {
  it('sends on the preferred channel', async () => {
    const sms = fakeNotifier('SMS');
    const email = fakeNotifier('EMAIL');

    const delivery = await dispatcherWith([email, sms]).dispatch('SMS', ALICE.contact, MESSAGE);

    expect(delivery).toEqual({ channel: 'SMS', degraded: false });
    expect(sms.sent).toEqual([{ contact: ALICE.contact, message: MESSAGE }]);
    expect(email.sent).toEqual([]);
  });

  it('switches to the fallback channels in configured order when the preferred one fails', async () => {
    const push = fakeNotifier('PUSH');
    const email = fakeNotifier('EMAIL');

    const delivery = await dispatcherWith([fakeNotifier('SMS', true), email, push], undefined, ['PUSH', 'EMAIL'])
      .dispatch('SMS', ALICE.contact, MESSAGE);

    expect(delivery).toEqual({ channel: 'PUSH', degraded: true });
    expect(email.sent).toEqual([]);
  });

  it('uses the last-resort notifier when every channel fails', async () => {
    const lastResort = fakeNotifier('LOG');

    const delivery = await dispatcherWith([fakeNotifier('SMS', true), fakeNotifier('EMAIL', true)], lastResort)
      .dispatch('SMS', ALICE.contact, MESSAGE);

    expect(delivery).toEqual({ channel: 'LOG', degraded: true });
    expect(lastResort.sent).toHaveLength(1);
  });

  it('skips channels that have no registered notifier', async () => {
    const email = fakeNotifier('EMAIL');

    const delivery = await dispatcherWith([email]).dispatch('PUSH', ALICE.contact, MESSAGE);

    expect(delivery).toEqual({ channel: 'EMAIL', degraded: true });
  });
});
