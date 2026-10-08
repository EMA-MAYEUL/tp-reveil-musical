import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleLogger, SystemClock } from '../../src/infrastructure/system.js';
import { ConsoleOutputSink } from '../../src/infrastructure/notification/sdk/simulatedSdks.js';

afterEach(() => vi.restoreAllMocks());

describe('system adapters', () => {
  it('SystemClock returns the current time', () => {
    const before = Date.now();
    expect(new SystemClock().now()).toBeGreaterThanOrEqual(before);
  });

  it('ConsoleLogger prefixes the level', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const logger = new ConsoleLogger();
    logger.info('hello');
    logger.warn('careful');

    expect(info).toHaveBeenCalledWith('[info] hello');
    expect(warn).toHaveBeenCalledWith('[warn] careful');
  });

  it('ConsoleOutputSink writes the line to stdout', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    new ConsoleOutputSink().write('[SMS] hi');

    expect(log).toHaveBeenCalledWith('[SMS] hi');
  });
});
