import type { Clock, Logger } from '../application/ports.js';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

export class ConsoleLogger implements Logger {
  info(message: string): void {
    console.info(`[info] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[warn] ${message}`);
  }
}
