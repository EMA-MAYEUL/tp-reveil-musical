import { describe, expect, it } from 'vitest';
import type { Channel } from '../../../src/domain/wakeUp.js';
import { EmailNotifier, LogNotifier, PushNotifier, SmsNotifier } from '../../../src/infrastructure/notification/notifiers.js';
import {
  SimulatedEmailSdk,
  SimulatedPushService,
  SimulatedSmsGateway,
} from '../../../src/infrastructure/notification/sdk/simulatedSdks.js';
import { notifierContract } from '../../contracts/notifierContract.js';

function recordingSink() {
  const output: string[] = [];
  return { output, outputSink: { write: (line: string) => output.push(line) } };
}

function sdkDeps(channel: Channel, outage: boolean) {
  const { output, outputSink } = recordingSink();
  return { output, deps: { outputSink, simulatedOutages: outage ? [channel] : [] } };
}

notifierContract('Email', ({ outage }) => {
  const { output, deps } = sdkDeps('EMAIL', outage);
  return { output, notifier: new EmailNotifier({ emailSdk: new SimulatedEmailSdk(deps) }) };
});

notifierContract('SMS', ({ outage }) => {
  const { output, deps } = sdkDeps('SMS', outage);
  return { output, notifier: new SmsNotifier({ smsGateway: new SimulatedSmsGateway(deps) }) };
});

notifierContract('Push', ({ outage }) => {
  const { output, deps } = sdkDeps('PUSH', outage);
  return { output, notifier: new PushNotifier({ pushService: new SimulatedPushService(deps) }) };
});

const MESSAGE = { subject: 'Réveil musical', body: 'Bon lundi !' };

describe('channel adapters', () => {
  it('maps the message to the email SDK format', async () => {
    const { output, deps } = sdkDeps('EMAIL', false);

    await new EmailNotifier({ emailSdk: new SimulatedEmailSdk(deps) }).notify({ email: 'a@b.fr' }, MESSAGE);

    expect(output).toEqual(['[EMAIL] to=a@b.fr subject="Réveil musical" <p>Bon lundi !</p>']);
  });

  it('turns a rejected SMS into an error', async () => {
    const gateway = { sendText: () => false } as unknown as SimulatedSmsGateway;

    await expect(new SmsNotifier({ smsGateway: gateway }).notify({ phone: '+33' }, MESSAGE)).rejects.toThrow('rejected');
  });

  it('turns a rejected push into an error', async () => {
    const service = { push: async () => 'rejected' } as unknown as SimulatedPushService;

    await expect(new PushNotifier({ pushService: service }).notify({ pushToken: 't' }, MESSAGE)).rejects.toThrow('rejected');
  });

  it('logs the undelivered wake-up as a last resort', async () => {
    const { output, outputSink } = recordingSink();

    await new LogNotifier({ outputSink }).notify({ email: 'a@b.fr' }, MESSAGE);

    expect(output).toEqual(['[LOG] undelivered wake-up for {"email":"a@b.fr"}: Bon lundi !']);
  });
});
