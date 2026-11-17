// Shared permission identity policy. Soul keeps body permissions, Mask borrows
// the masked target's permissions, and Swap uses its already-switched entryCharacter.
export function getFakerActingIds(entryCharacter, faker = {}, configuredMode = 'soul') {
    const ids = [entryCharacter || 'player'];
    const mode = faker.mode || configuredMode || 'soul';
    if (faker.active && mode === 'mask' && typeof faker.targetId === 'string' && faker.targetId) {
        ids.push(faker.targetId);
    }
    return [...new Set(ids)];
}

// During Mask, relationship ownership follows the borrowed identity while all
// writes and runtime mutations continue to belong to the real entry character.
export function getFakerRelationshipIdentityId(runtimeOwnerId, entryCharacter, faker = {}) {
    const ownerId = runtimeOwnerId || entryCharacter || 'player';
    if (
        faker.active === true &&
        faker.mode === 'mask' &&
        ownerId === (entryCharacter || 'player') &&
        typeof faker.targetId === 'string' &&
        faker.targetId
    ) {
        return faker.targetId;
    }
    return ownerId;
}
