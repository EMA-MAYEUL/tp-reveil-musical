import { describe, expect, it } from 'vitest';
import { NotificationDispatcher } from '../../src/application/NotificationDispatcher.js';
import { TrackResolver } from '../../src/application/TrackResolver.js';
import { WakeUpService } from '../../src/application/WakeUpService.js';
import { UnknownUserError } from '../../src/domain/errors.js';
import { ALICE, fakeFallbackTrackProvider, fakeLogger, fakeMusicCatalog, fakeNotifier, fakeUserProfileRepository } from '../fakes.js';

function setup() {
  const catalog = fakeMusicCatalog('catalog');
  const sms = fakeNotifier('SMS');
  const logger = fakeLogger();
  const service = new WakeUpService({
    userProfileRepository: fakeUserProfileRepository(),
    trackResolver: new TrackResolver({ musicCatalogs: [catalog], fallbackTrackProvider: fakeFallbackTrackProvider(), logger }),
    notificationDispatcher: new NotificationDispatcher({
      notifiers: [sms],
      lastResortNotifier: fakeNotifier('LOG'),
      notificationFallbackOrder: [],
      logger,
    }),
  });
  return { service, catalog, sms };
}

describe('WakeUpService', () => {
  it('picks the track chosen for the weather and notifies on the preferred channel', async () => {
    const { service, catalog, sms } = setup();

    const result = await service.wakeUp({ userId: 'alice', dayOfWeek: 'LUNDI', weather: 'SOLEIL' });

    expect(catalog.queries).toEqual(['Here Comes the Sun']);
    expect(result).toEqual({
      userId: 'alice',
      track: { title: 'Here Comes the Sun', artist: 'catalog artist' },
      musicSource: 'catalog',
      channel: 'SMS',
      degraded: { music: false, notification: false },
    });
    expect(sms.sent[0]).toEqual({
      contact: ALICE.contact,
      message: { subject: 'Réveil musical', body: 'Bon lundi ! Ton morceau du jour : Here Comes the Sun - catalog artist' },
    });
  });

  it('uses the fallback track when the weather is not covered by the user', async () => {
    const { service, catalog } = setup();

    await service.wakeUp({ userId: 'alice', dayOfWeek: 'MARDI', weather: 'NEIGE' });

    expect(catalog.queries).toEqual(['Wake Me Up']);
  });

  it('rejects an unknown user', async () => {
    const { service } = setup();

    await expect(service.wakeUp({ userId: 'bob', dayOfWeek: 'LUNDI', weather: 'SOLEIL' })).rejects.toBeInstanceOf(
      UnknownUserError,
    );
  });
});
