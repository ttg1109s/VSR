/**
 * Headless Password domain primitives. This module owns challenge lifecycle,
 * attempt accounting and deadline checks; presentation remains an adapter.
 */
export class PasswordSystem {
  constructor({ clock = () => Date.now(), createId } = {}) {
    if (typeof clock !== 'function') throw new TypeError('PasswordSystem clock must be a function.');
    this.clock = clock;
    this.createId = createId || (() => `pw_${this.clock().toString(36)}_${(++this.sequence).toString(36)}`);
    this.sequence = 0;
  }

  open({ actionId, uniqueId, sceneId, routerId, type, passwordId, config = {}, runtime = {} }) {
    if (![actionId, uniqueId, sceneId, routerId, type, passwordId].every(value =>
      typeof value === 'string' && value.trim().length > 0)) {
      throw new TypeError('Password challenge requires action, identity, scene, router, type and password ID.');
    }
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new TypeError('Password challenge config must be an object.');
    }

    const rawRetryMax = config.retryMax === undefined ? 3 : Number(config.retryMax);
    if (!Number.isFinite(rawRetryMax) || rawRetryMax < 0) {
      throw new TypeError('Password retryMax must be a non-negative finite number.');
    }
    const retryMax = Math.floor(rawRetryMax);
    const timerSeconds = config.timer === undefined ? 0 : Number(config.timer);
    if (!Number.isFinite(timerSeconds) || timerSeconds < 0) {
      throw new TypeError('Password timer must be a non-negative finite number.');
    }
    const rawCountTest = runtime.countTest === undefined ? 0 : Number(runtime.countTest);
    if (!Number.isFinite(rawCountTest) || rawCountTest < 0) {
      throw new TypeError('Password countTest must be a non-negative finite number.');
    }
    const now = this.clock();
    if (!Number.isFinite(now)) throw new TypeError('PasswordSystem clock must return a finite timestamp.');

    const challengeId = this.createId();
    if (typeof challengeId !== 'string' || !challengeId.trim()) {
      throw new TypeError('Password challenge ID factory must return a non-empty string.');
    }

    return {
      challengeId,
      actionId, uniqueId, sceneId, routerId, type, passwordId,
      status: 'active',
      countTest: Math.floor(rawCountTest),
      retryMax,
      startedAt: now,
      deadlineAt: timerSeconds > 0 ? now + timerSeconds * 1000 : null
    };
  }

  inspect(challenge) {
    if (!challenge || challenge.status !== 'active') return { accepted: false, reason: 'inactive' };
    if (challenge.deadlineAt !== null && challenge.deadlineAt !== undefined) {
      if (!Number.isFinite(challenge.deadlineAt)) return { accepted: false, reason: 'invalid_deadline' };
      if (this.clock() >= challenge.deadlineAt) return { accepted: false, reason: 'expired' };
    }
    return {
      accepted: true,
      remainingAttempts: challenge.retryMax === 0
        ? null : Math.max(0, challenge.retryMax - challenge.countTest)
    };
  }

  recordFailure(challenge) {
    const inspected = this.inspect(challenge);
    if (!inspected.accepted) return { ...inspected, challenge };
    challenge.countTest += 1;
    const exhausted = challenge.retryMax > 0 && challenge.countTest >= challenge.retryMax;
    if (exhausted) challenge.status = 'exhausted';
    return {
      accepted: true, exhausted,
      remainingAttempts: challenge.retryMax === 0 ? null : Math.max(0, challenge.retryMax - challenge.countTest),
      challenge
    };
  }

  finish(challenge, status) {
    if (!challenge || challenge.status !== 'active') return false;
    if (!['succeeded', 'cancelled', 'expired', 'exhausted'].includes(status)) {
      throw new TypeError(`Invalid terminal Password status: ${status}`);
    }
    challenge.status = status;
    challenge.closedAt = this.clock();
    return true;
  }
}
