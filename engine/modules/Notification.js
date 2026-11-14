import { cloneJsonValue } from '../../protocol/JsonProtocol.js';

const SEVERITY_ALIASES = Object.freeze({
  info: 'info', success: 'success', warn: 'warning', warning: 'warning',
  danger: 'danger', error: 'danger', magic: 'special', special: 'special'
});
const PRIORITY = Object.freeze({ danger: 5, warning: 4, special: 3, success: 2, info: 1 });

export class NotificationSystem {
  constructor({ protocol, engineId = 'vsr', clock = () => Date.now(), maxHistory = 200, maxQueue = 100, dedupeWindowMs = 750, defaultDurationMs = 5000 } = {}) {
    if (!protocol || typeof protocol.publish !== 'function') throw new TypeError('NotificationSystem requires a Protocol publisher.');
    if (typeof clock !== 'function') throw new TypeError('NotificationSystem clock must be a function.');
    Object.assign(this, { protocol, engineId, clock, maxHistory, maxQueue, dedupeWindowMs, defaultDurationMs });
    this.sequence = 0;
    this.history = [];
    this.pending = [];
    this.byId = new Map();
    this.dedupe = new Map();
  }

  normalize(input = {}, presentation = 'toast') {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Notification must be an object.');
    const title = input.title == null ? 'Thông báo' : String(input.title);
    const message = input.message == null ? '' : String(input.message);
    const originalLevel = String(input.level || input.severity || 'info').toLowerCase();
    const severity = SEVERITY_ALIASES[originalLevel] || 'info';
    const now = this.clock();
    const duration = input.duration === undefined
      ? (presentation === 'modal' ? null : this.defaultDurationMs)
      : input.duration;
    if (duration !== null && (!Number.isFinite(duration) || duration < 0)) throw new TypeError('Notification duration must be a non-negative number or null.');
    const id = input.id || `${this.engineId}:notification:${++this.sequence}`;
    return {
      id: String(id), source: String(input.source || 'engine'),
      category: String(input.category || `${input.source || 'engine'}.${title}`),
      title, message, severity, level: originalLevel,
      priority: Number.isFinite(input.priority) ? input.priority : PRIORITY[severity],
      presentation: presentation === 'modal' ? 'modal' : 'toast',
      createdAt: now, updatedAt: now,
      expiresAt: duration === null ? null : now + duration,
      duration, dedupeKey: input.dedupeKey == null ? null : `${input.source || 'engine'}:${input.category || title}:${String(input.dedupeKey)}`,
      status: 'pending', read: false,
      metadata: input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata) ? cloneJsonValue(input.metadata) : {}
    };
  }

  publish(kind, notification, args = null) {
    const payload = { notification, ...(args ? { args } : {}) };
    return this.protocol.publish(`presentation.notification.${kind}`, payload);
  }

  add(title, message, level = 'info', options = {}) {
    if (title && typeof title === 'object' && !Array.isArray(title)) {
      const input = title;
      options = message && typeof message === 'object' ? message : input;
      title = input.title;
      message = input.message;
      level = input.level || input.severity || 'info';
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
        previous.updatedAt = now;
        previous.expiresAt = candidate.expiresAt;
        previous.duration = candidate.duration;
        previous.metadata = candidate.metadata;
        this.publish('updated', previous, [previous.title, previous.message, previous.level]);
        return { notification: { ...previous }, deduplicated: true };
      }
      this.dedupe.set(candidate.dedupeKey, candidate.id);
    }
    this.history.push(candidate);
    this.pending.push(candidate.id);
    this.byId.set(candidate.id, candidate);
    this.pending.sort((a, b) => {
      const left = this.byId.get(a), right = this.byId.get(b);
      return (right?.priority || 0) - (left?.priority || 0) || (left?.createdAt || 0) - (right?.createdAt || 0);
    });
    while (this.history.length > this.maxHistory) {
      const removed = this.history.shift();
      this.byId.delete(removed.id);
      this.pending = this.pending.filter(id => id !== removed.id);
      if (removed.dedupeKey && this.dedupe.get(removed.dedupeKey) === removed.id) this.dedupe.delete(removed.dedupeKey);
    }
    this.publish(presentation === 'modal' ? 'alert' : 'add', candidate, [candidate.title, candidate.message, candidate.level]);
    while (this.pending.length > this.maxQueue) {
      const droppedId = this.pending.pop();
      const dropped = this.byId.get(droppedId);
      if (dropped) {
        dropped.status = 'dropped';
        dropped.dismissedAt = now;
        dropped.dismissReason = 'queue_overflow';
        this.publish('dropped', dropped);
      }
    }
    return { notification: { ...candidate }, deduplicated: false };
  }

  alert(title, message, level = 'info', options = {}) {
    return this.add(title, message, level, { ...options, presentation: 'modal', duration: options.duration === undefined ? null : options.duration });
  }

  notify(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('notify() expects a notification object.');
    const { presentation = 'toast', ...rest } = input;
    return presentation === 'modal' ? this.alert(rest.title, rest.message, rest.level || rest.severity || 'info', rest) : this.add(rest.title, rest.message, rest.level || rest.severity || 'info', rest);
  }

  dismiss(id, reason = 'dismissed') {
    const notification = this.byId.get(String(id));
    if (!notification || notification.status !== 'pending') return false;
    notification.status = reason === 'expired' ? 'expired' : 'dismissed';
    notification.dismissedAt = this.clock();
    notification.dismissReason = String(reason);
    this.pending = this.pending.filter(itemId => itemId !== notification.id);
    this.publish(reason === 'expired' ? 'expired' : 'dismiss', notification);
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
      this.history = [];
      this.pending = [];
      this.byId.clear();
      this.dedupe.clear();
    }
  }
}
