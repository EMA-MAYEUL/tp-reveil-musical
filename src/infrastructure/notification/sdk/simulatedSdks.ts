// Simulated third-party SDKs: no real sending, each one writes a line to the output sink.
// Their interfaces differ on purpose; the adapters bring them back to the Notifier port.
import type { Channel } from '../../../domain/wakeUp.js';

export interface OutputSink {
  write(line: string): void;
}

export class ConsoleOutputSink implements OutputSink {
  write(line: string): void {
    console.log(line);
  }
}

interface SdkDeps {
  outputSink: OutputSink;
  /** Channels configured as down, to demonstrate the fallback without a real outage. */
  simulatedOutages: Channel[];
}

abstract class SimulatedSdk {
  protected readonly sink: OutputSink;
  private readonly down: boolean;

  protected constructor({ outputSink, simulatedOutages }: SdkDeps, channel: Channel) {
    this.sink = outputSink;
    this.down = simulatedOutages.includes(channel);
  }

  protected ensureUp(service: string): void {
    if (this.down) throw new Error(`${service} service unavailable (simulated outage)`);
  }
}

export class SimulatedEmailSdk extends SimulatedSdk {
  constructor(deps: SdkDeps) {
    super(deps, 'EMAIL');
  }

  async sendMail(mail: { to: string; subject: string; html: string }): Promise<void> {
    this.ensureUp('Email');
    this.sink.write(`[EMAIL] to=${mail.to} subject="${mail.subject}" ${mail.html}`);
  }
}

export class SimulatedSmsGateway extends SimulatedSdk {
  constructor(deps: SdkDeps) {
    super(deps, 'SMS');
  }

  /** Returns false when the gateway rejects the message. */
  sendText(phoneNumber: string, text: string): boolean {
    this.ensureUp('SMS');
    this.sink.write(`[SMS] ${phoneNumber}: ${text}`);
    return true;
  }
}

export class SimulatedPushService extends SimulatedSdk {
  constructor(deps: SdkDeps) {
    super(deps, 'PUSH');
  }

  async push(deviceToken: string, payload: { title: string; message: string }): Promise<'delivered' | 'rejected'> {
    this.ensureUp('Push');
    this.sink.write(`[PUSH] device=${deviceToken} ${payload.title}: ${payload.message}`);
    return 'delivered';
  }
}
