import type { Notifier } from '../../application/ports.js';
import type { Contact, WakeUpMessage } from '../../domain/wakeUp.js';
import type { OutputSink, SimulatedEmailSdk, SimulatedPushService, SimulatedSmsGateway } from './sdk/simulatedSdks.js';

// Adapters: each one translates the common Notifier port to one SDK's own interface.

export class EmailNotifier implements Notifier {
  readonly channel = 'EMAIL';
  private readonly sdk: SimulatedEmailSdk;

  constructor({ emailSdk }: { emailSdk: SimulatedEmailSdk }) {
    this.sdk = emailSdk;
  }

  async notify(contact: Contact, message: WakeUpMessage): Promise<void> {
    await this.sdk.sendMail({ to: required(contact.email, 'email'), subject: message.subject, html: `<p>${message.body}</p>` });
  }
}

export class SmsNotifier implements Notifier {
  readonly channel = 'SMS';
  private readonly sdk: SimulatedSmsGateway;

  constructor({ smsGateway }: { smsGateway: SimulatedSmsGateway }) {
    this.sdk = smsGateway;
  }

  async notify(contact: Contact, message: WakeUpMessage): Promise<void> {
    if (!this.sdk.sendText(required(contact.phone, 'phone'), message.body)) {
      throw new Error('SMS rejected by the gateway');
    }
  }
}

export class PushNotifier implements Notifier {
  readonly channel = 'PUSH';
  private readonly sdk: SimulatedPushService;

  constructor({ pushService }: { pushService: SimulatedPushService }) {
    this.sdk = pushService;
  }

  async notify(contact: Contact, message: WakeUpMessage): Promise<void> {
    const status = await this.sdk.push(required(contact.pushToken, 'pushToken'), { title: message.subject, message: message.body });
    if (status !== 'delivered') {
      throw new Error('Push notification rejected');
    }
  }
}

/** Last resort: records the wake-up in the log so it is never lost silently. */
export class LogNotifier implements Notifier {
  readonly channel = 'LOG';
  private readonly sink: OutputSink;

  constructor({ outputSink }: { outputSink: OutputSink }) {
    this.sink = outputSink;
  }

  async notify(contact: Contact, message: WakeUpMessage): Promise<void> {
    this.sink.write(`[LOG] undelivered wake-up for ${JSON.stringify(contact)}: ${message.body}`);
  }
}

function required(value: string | undefined, field: string): string {
  if (!value) throw new Error(`missing ${field} in user contact`);
  return value;
}
