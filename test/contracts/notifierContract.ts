import { describe, expect, it } from 'vitest';
import type { Notifier } from '../../src/application/ports.js';
import type { Contact } from '../../src/domain/wakeUp.js';

const FULL_CONTACT: Contact = { email: 'alice@example.com', phone: '+33600000000', pushToken: 'token' };
const MESSAGE = { subject: 'Réveil musical', body: 'Bon lundi !' };

/** Contract every channel adapter must honour. `build` returns the notifier and the lines its SDK wrote. */
export function notifierContract(
  label: string,
  build: (options: { outage: boolean }) => { notifier: Notifier; output: string[] },
) {
  describe(`Notifier contract: ${label}`, () => {
    it('delivers the message body through its SDK', async () => {
      const { notifier, output } = build({ outage: false });

      await notifier.notify(FULL_CONTACT, MESSAGE);

      expect(output).toHaveLength(1);
      expect(output[0]).toContain(MESSAGE.body);
    });

    it('fails, instead of staying silent, when the contact for its channel is missing', async () => {
      const { notifier, output } = build({ outage: false });

      await expect(notifier.notify({}, MESSAGE)).rejects.toThrow(/missing/);
      expect(output).toEqual([]);
    });

    it('fails when its provider is down', async () => {
      const { notifier } = build({ outage: true });

      await expect(notifier.notify(FULL_CONTACT, MESSAGE)).rejects.toThrow(/unavailable/);
    });
  });
}
