import { cloneJsonValue } from '../../protocol/JsonProtocol.js';

const PRIORITY = Object.freeze({ danger: 5, warning: 4, special: 3, success: 2, info: 1 });

export class NotificationSystem {
  constructor({ protocol, engineId = 'vsr', clock = () => Date.now(), schedule = (callback, delay) => setTimeout(callback, delay), cancelSchedule = handle => clearTimeout(handle), maxHistory = 200, maxQueue = 100, dedupeWindowMs = 750, rateWindowMs = 1000, maxPerWindow = 20, maxRateBuckets = 500, defaultDurationMs = 5000 } = {}) {
    if (!protocol || typeof protocol.publish !== 'function') throw new TypeError('NotificationSystem requires a Protocol publisher.');
    if (typeof clock !== 'function') throw new TypeError('NotificationSystem clock must be a function.');
    Object.assign(this, { protocol, engineId, clock, schedule, cancelSchedule, maxHistory, maxQueue, dedupeWindowMs, rateWindowMs, maxPerWindow, maxRateBuckets, defaultDurationMs });
    this.sequence = 0;
    this.history = [];
    this.pending = [];
    this.byId = new Map();
    this.dedupe = new Map();
    this.timers = new Map();
    this.rateBuckets = new Map();
  }

  normalize(input = {}, presentation = 'toast') {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Notification must be an object.');
    if (Object.hasOwn(input, 'severity')) throw new TypeError('Notification uses the level field; severity is not supported.');
    const title = input.title == null ? 'Notification' : String(input.title);
    const message = input.message == null ? '' : String(input.message);
    const originalLevel = String(input.level ?? 'info').toLowerCase();
    if (!Object.hasOwn(PRIORITY, originalLevel)) throw new TypeError(`Unsupported notification level: ${originalLevel}`);
    const severity = originalLevel;
    const requestedPresentation = presentation === 'modal' ? 'modal' : 'toast';
    const effectivePresentation = requestedPresentation === 'modal' && ['danger', 'special'].includes(originalLevel)
      ? 'modal'
      : 'toast';
    const now = this.clock();
    const requestedDuration = input.duration === undefined
      ? (effectivePresentation === 'modal' ? null : this.defaultDurationMs)
      : input.duration;
    if (requestedDuration !== null && (!Number.isFinite(requestedDuration) || requestedDuration < 0)) throw new TypeError('Notification duration must be a non-negative number or null.');
    const duration = requestedDuration === null ? null : Math.min(30000, requestedDuration);
    const soundProfile = String(input.soundProfile || 'default');
    if (!['default', 'soft', 'success', 'warning', 'critical', 'special'].includes(soundProfile)) throw new TypeError('Unsupported notification sound profile: ' + soundProfile);
    const category = String(input.category || `${input.source || 'engine'}.${title}`).slice(0, 80);
    if (!category.trim()) throw new TypeError('Notification category must contain at least 1 character.');
    const id = input.id || `${this.engineId}:notification:${++this.sequence}`;
    return {
      id: String(id), source: String(input.source || 'engine'),
      category,
      title, message, severity, level: originalLevel,
      priority: Number.isFinite(input.priority) ? Math.min(10, Math.max(0, input.priority)) : PRIORITY[severity],
      requestedPresentation,
      presentation: effectivePresentation,
      sound: true,
      soundProfile,
      createdAt: now, updatedAt: now,
      expiresAt: duration === null ? null : now + duration,
      duration, dedupeKey: input.dedupe === false ? null : (input.dedupeKey == null ? `${input.source || 'engine'}:${input.category || title}:${title}:${message}` : `${input.source || 'engine'}:${input.category || title}:${String(input.dedupeKey)}`),
      status: 'pending', read: false,
      metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata) ? cloneJsonValue(input.metadata) : {}
    };
  }

  scheduleExpiry(notification) {
    this.cancelExpiry(notification.id);
    if (notification.expiresAt === null || notification.status !== 'pending') return;
    const delay = Math.max(0, notification.expiresAt - this.clock());
    const timer = this.schedule(() => {
      this.timers.delete(notification.id);
      if (!this.expire(notification.id) && this.byId.get(notification.id)?.status === 'pending') {
        this.scheduleExpiry(notification);
      }
    }, Math.max(1, delay), `notification_expiry_${notification.id}`);
    timer?.unref?.();
    this.timers.set(notification.id, timer);
  }

  cancelExpiry(id) {
    if (!this.timers.has(id)) return;
    this.cancelSchedule(this.timers.get(id));
    this.timers.delete(id);
  }

  publish(kind, notification) {
    return this.protocol.publish(`presentation.notification.${kind}`, { notification });
  }

  add(title, message, level = 'info', options = {}) {
    if (title && typeof title === 'object' && !Array.isArray(title)) {
      const input = title;
      options = message && typeof message === 'object' ? message : input;
      title = input.title;
      message = input.message;
      level = input.level ?? 'info';
    }
    options = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    const presentation = options.presentation === 'modal' ? 'modal' : 'toast';
    const candidate = this.normalize({
      title, message, level,
      ...options,
      source: options.source || 'engine'
    }, presentation);
    const now = candidate.createdAt;
    if (candidate.dedupeKey) {
      const previousId = this.dedupe.get(candidate.dedupeKey);
      const previous = previousId ? this.byId.get(previousId) : null;
      if (previous && previous.status === 'pending' && now - previous.updatedAt <= this.dedupeWindowMs) {
        previous.title = candidate.title;
        previous.message = candidate.message;
        previous.severity = candidate.severity;
        previous.level = candidate.level;
        previous.priority = candidate.priority;
        previous.presentation = candidate.presentation;
        previous.sound = candidate.sound;
        previous.soundProfile = candidate.soundProfile;
        previous.updatedAt = now;
        previous.expiresAt = candidate.expiresAt;
        previous.duration = candidate.duration;
        previous.metadata = candidate.metadata;
        this.publish('updated', previous);
        this.scheduleExpiry(previous);
        return { notification: { ...previous }, deduplicated: true };
      }
      this.dedupe.set(candidate.dedupeKey, candidate.id);
    }
    const rateKey = `${candidate.source}:${candidate.category}`;
    if (!this.rateBuckets.has(rateKey) && this.rateBuckets.size >= this.maxRateBuckets) {
      this.rateBuckets.delete(this.rateBuckets.keys().next().value);
    }
    const recent = (this.rateBuckets.get(rateKey) || []).filter(timestamp => now - timestamp < this.rateWindowMs);
    if (recent.length >= this.maxPerWindow) {
      this.rateBuckets.set(rateKey, recent);
      this.protocol.publish('presentation.notification.rateLimited', {
        source: candidate.source, category: candidate.category,
        limit: this.maxPerWindow, windowMs: this.rateWindowMs,
        retryAfterMs: Math.max(0, this.rateWindowMs - (now - recent[0]))
      });
      return { notification: null, deduplicated: false, rateLimited: true };
    }
    recent.push(now);
    this.rateBuckets.set(rateKey, recent);
    this.history.push(candidate);
    this.pending.push(candidate.id);
    this.byId.set(candidate.id, candidate);
    this.pending.sort((a, b) => {
      const left = this.byId.get(a), right = this.byId.get(b);
      return (right?.priority || 0) - (left?.priority || 0) || (left?.createdAt || 0) - (right?.createdAt || 0);
    });
    while (this.history.length > this.maxHistory) {
      const removed = this.history.shift();
      this.cancelExpiry(removed.id);
      this.byId.delete(removed.id);
      this.pending = this.pending.filter(id => id !== removed.id);
      if (removed.dedupeKey && this.dedupe.get(removed.dedupeKey) === removed.id) this.dedupe.delete(removed.dedupeKey);
    }
    this.publish(candidate.presentation === 'modal' ? 'alert' : 'add', candidate);
    this.scheduleExpiry(candidate);
    while (this.pending.length > this.maxQueue) {
      const droppedId = this.pending.pop();
      const dropped = this.byId.get(droppedId);
      if (dropped) {
        this.cancelExpiry(dropped.id);
        dropped.status = 'dropped';
        dropped.dismissedAt = now;
        dropped.dismissReason = 'queue_overflow';
        this.publish('dropped', dropped);
      }
    }
    return { notification: { ...candidate }, deduplicated: false };
  }

  alert(title, message, level = 'info', options = {}) {
    return this.add(title, message, level, { ...options, presentation: 'modal', duration: options.duration });
  }

  notify(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('notify() expects a notification object.');
    const { presentation = 'toast', ...rest } = input;
    return presentation === 'modal' ? this.alert(rest.title, rest.message, rest.level ?? 'info', rest) : this.add(rest.title, rest.message, rest.level ?? 'info', rest);
  }

  dismiss(id, reason = 'dismissed') {
    const notification = this.byId.get(String(id));
    if (!notification || notification.status !== 'pending') return false;
    this.cancelExpiry(notification.id);
    notification.status = reason === 'expired' ? 'expired' : 'dismissed';
    notification.dismissedAt = this.clock();
    notification.dismissReason = String(reason);
    this.pending = this.pending.filter(itemId => itemId !== notification.id);
    const eventKind = reason === 'expired' ? 'expired' : reason === 'cleared' ? 'cleared' : 'dismiss';
    this.publish(eventKind, notification);
    return true;
  }

  expire(id) {
    const notification = this.byId.get(String(id));
    if (!notification || notification.expiresAt === null || notification.expiresAt > this.clock()) return false;
    return this.dismiss(id, 'expired');
  }

  markRead(id) {
    const notification = this.byId.get(String(id));
    if (!notification || notification.read) return false;
    notification.read = true;
    notification.readAt = this.clock();
    this.protocol.publish('presentation.notification.read', { notification: { ...notification } });
    return true;
  }

  markAllRead({ source } = {}) {
    const targets = this.history.filter(item =>
      !item.read && (source === undefined || item.source === source)
    );
    const readAt = this.clock();
    for (const notification of targets) {
      notification.read = true;
      notification.readAt = readAt;
      this.protocol.publish('presentation.notification.read', { notification: { ...notification } });
    }
    return targets.length;
  }

  clear({ source, includeRead = true } = {}) {
    const targets = this.pending.map(id => this.byId.get(id)).filter(item =>
      item && (source === undefined || item.source === source) && (includeRead || !item.read)
    );
    for (const item of targets) this.dismiss(item.id, 'cleared');
    return targets.length;
  }

  getHistory({ limit = this.maxHistory, source, unreadOnly = false } = {}) {
    const safeLimit = Number.isInteger(limit) && limit >= 0 ? limit : this.maxHistory;
    if (safeLimit === 0) return [];
    return this.history
      .filter(item => (source === undefined || item.source === source) && (!unreadOnly || !item.read))
      .slice(-safeLimit)
      .map(item => ({ ...item }));
  }

  getPending() {
    return this.pending.map(id => this.byId.get(id)).filter(Boolean).map(item => ({ ...item }));
  }

  reset({ clearHistory = true } = {}) {
    if (clearHistory) {
      for (const timer of this.timers.values()) this.cancelSchedule(timer);
      this.timers.clear();
      this.history = [];
      this.pending = [];
      this.byId.clear();
      this.dedupe.clear();
      this.rateBuckets.clear();
    }
  }
}
