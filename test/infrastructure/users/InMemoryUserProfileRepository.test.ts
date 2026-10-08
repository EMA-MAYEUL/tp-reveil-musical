import { describe, expect, it } from 'vitest';
import { InMemoryUserProfileRepository } from '../../../src/infrastructure/users/InMemoryUserProfileRepository.js';
import { ALICE } from '../../fakes.js';

describe('InMemoryUserProfileRepository', () => {
  const repository = new InMemoryUserProfileRepository({ seedProfiles: [ALICE] });

  it('finds a seeded profile by id', async () => {
    await expect(repository.findById('alice')).resolves.toEqual(ALICE);
  });

  it('returns undefined for an unknown id', async () => {
    await expect(repository.findById('nobody')).resolves.toBeUndefined();
  });
});
