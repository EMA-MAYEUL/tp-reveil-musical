import type { UserProfile } from '../../domain/wakeUp.js';

// Demo data for the mocked internal user service.
export const SEED_PROFILES: UserProfile[] = [
  {
    userId: 'alice',
    tracksByWeather: { SOLEIL: 'Here Comes the Sun', PLUIE: 'Riders on the Storm', NEIGE: 'Let It Snow' },
    fallbackTrack: 'Wake Me Up Avicii',
    preferredChannel: 'SMS',
    contact: { phone: '+33600000001', email: 'alice@example.com' },
  },
  {
    userId: 'bob',
    tracksByWeather: { NUAGEUX: 'Clocks Coldplay' },
    fallbackTrack: 'Good Morning Kanye West',
    preferredChannel: 'EMAIL',
    contact: { email: 'bob@example.com' },
  },
  {
    userId: 'chloe',
    tracksByWeather: { SOLEIL: 'Walking on Sunshine', PLUIE: 'Purple Rain' },
    fallbackTrack: 'Happy Pharrell Williams',
    preferredChannel: 'PUSH',
    contact: { pushToken: 'device-chloe-123', email: 'chloe@example.com' },
  },
];
