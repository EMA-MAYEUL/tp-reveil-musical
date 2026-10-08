import type { UserProfileRepository } from '../../application/ports.js';
import type { UserProfile } from '../../domain/wakeUp.js';

/** Stand-in for the internal user service (mocked in this TP): profiles are injected at startup. */
export class InMemoryUserProfileRepository implements UserProfileRepository {
  private readonly profiles: UserProfile[];

  constructor({ seedProfiles }: { seedProfiles: UserProfile[] }) {
    this.profiles = seedProfiles;
  }

  async findById(userId: string): Promise<UserProfile | undefined> {
    return this.profiles.find((profile) => profile.userId === userId);
  }
}
