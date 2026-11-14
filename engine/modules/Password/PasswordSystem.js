/**
 * Headless Password domain primitives. This module owns challenge lifecycle,
 * attempt accounting and deadline checks; presentation remains an adapter.
 */
export class PasswordSystem {
  constructor({ clock = () => Date.now(), createId } = {}) {
    this.clock = clock;
    this.createId = createId || (() => `pw_${this.clock().toString(36)}_${(++this.sequence).toString(36)}`);
    this.sequence = 0;
  }

  open({ actionId, uniqueId, sceneId, routerId, type, passwordId, config = {}, runtime = {} }) {
    if (!actionId || !uniqueId || !sceneId || !routerId || !type || !passwordId) {
      throw new TypeError('Password challenge requires action, identity, scene, router, type and password ID.');
    }
    const retryMax = Number.isFinite(Number(config.retryMax)) ? Math.max(0, Math.floor(Number(config.retryMax))) : 0;
    const timerSeconds = Number(config.timer);
    const now = this.clock();
    return {
      challengeId: this.createId(),
      actionId, uniqueId, sceneId, routerId, type, passwordId,
      status: 'active',
      countTest: Math.max(0, Math.floor(Number(runtime.countTest) || 0)),
      retryMax,
      startedAt: now,
      deadlineAt: Number.isFinite(timerSeconds) && timerSeconds > 0
        ? now + timerSeconds * 1000 : null
    };
  }

  inspect(challenge) {
    if (!challenge || challenge.status !== 'active') return { accepted: false, reason: 'inactive' };
    if (challenge.deadlineAt !== null && challenge.deadlineAt !== undefined && this.clock() >= challenge.deadlineAt) {
      return { accepted: false, reason: 'expired' };
    }
    return { accepted: true, remainingAttempts: challenge.retryMax === 0 ? null : Math.max(0, challenge.retryMax - challenge.countTest) };
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
