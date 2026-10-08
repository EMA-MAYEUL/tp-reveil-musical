export class UnknownUserError extends Error {
  constructor(readonly userId: string) {
    super(`Unknown user: ${userId}`);
    this.name = 'UnknownUserError';
  }
}

/** Thrown by any adapter when its external provider cannot be used (network, timeout, bad status, bad payload). */
export class ProviderUnavailableError extends Error {
  constructor(readonly provider: string, reason: string) {
    super(`${provider} unavailable: ${reason}`);
    this.name = 'ProviderUnavailableError';
  }
}
