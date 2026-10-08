export const WEATHER_TYPES = ['SOLEIL', 'PLUIE', 'NEIGE', 'NUAGEUX'] as const;
export type Weather = (typeof WEATHER_TYPES)[number];

export const DAYS_OF_WEEK = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const CHANNELS = ['EMAIL', 'SMS', 'PUSH'] as const;
export type Channel = (typeof CHANNELS)[number];

export interface Track {
  title: string;
  artist: string;
}

export interface Contact {
  email?: string;
  phone?: string;
  pushToken?: string;
}

export interface UserProfile {
  userId: string;
  /** Search query of the track chosen by the user for each weather type. */
  tracksByWeather: Partial<Record<Weather, string>>;
  /** Search query used when the weather of the day is not covered. */
  fallbackTrack: string;
  preferredChannel: Channel;
  contact: Contact;
}

export interface WakeUpRequest {
  userId: string;
  dayOfWeek: DayOfWeek;
  weather: Weather;
}

export interface WakeUpMessage {
  subject: string;
  body: string;
}

export function buildWakeUpMessage(dayOfWeek: DayOfWeek, track: Track): WakeUpMessage {
  const day = dayOfWeek.toLowerCase();
  return {
    subject: 'Réveil musical',
    body: `Bon ${day} ! Ton morceau du jour : ${track.title} - ${track.artist}`,
  };
}
