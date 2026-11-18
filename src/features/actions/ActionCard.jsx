import React, { memo, useEffect, useRef, useState } from 'react';
import { Badge, Button, Dialog, Grid, Input, MediaFrame, Popover, ProgressBar, Textarea } from '../../design-system/index.js';

const REASONS = {
  locked: 'Locked',
  permission_denied: 'Permission denied',
  not_read: 'Read description',
  cooldown: 'On cooldown',
  requirement_unavailable: 'Req. unknown',
  target_locked: 'Target is locked',
  password_required: 'Ready',
  challenge_active: 'Challenge active',
};
const REASON_TONES = {
  locked: 'danger', permission_denied: 'danger', target_locked: 'danger',
  requirement_failed: 'warning', not_read: 'warning', cooldown: 'warning',
  password_required: 'info', challenge_active: 'info', requirement_unavailable: 'info', available: 'success',
};
const seconds = (until, now) => Number.isFinite(until) ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;

function ActionCard({ action, pending = false, interactionBlocked = false, passwordChallenge = null, onTrigger, onMarkRead, onSubmitPassword, onCancelPassword, onRefreshSnapshot }) {
  const [input, setInput] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [clock, setClock] = useState(Date.now());
  const readRequestRef = useRef(false);
  const meta = action.meta || {};
  const presentation = action.presentation || {};
  const availability = action.availability || { canTrigger: false, reason: 'unknown' };
  const reason = availability.reason || 'unknown';
  const description = meta.description || meta.desc || '';
  const locked = presentation.display === 'locked' || reason === 'locked';
  const readRequired = presentation.readRequired === true;
  const read = presentation.read === true;
  const challengeOpen = !!passwordChallenge && passwordChallenge.uniqueId === action.key;
  const structured = ['puzzle', 'find_way'].includes(passwordChallenge?.type);
  const cooldown = seconds(availability.cooldownUntil, clock);
  const coolingDown = reason === 'cooldown';
  const cooldownDurationMs = Number.isFinite(availability.cooldownDuration) && availability.cooldownDuration > 0 ? availability.cooldownDuration * 1000 : null;
  const cooldownStartedAt = Number.isFinite(availability.cooldownStartedAt) ? availability.cooldownStartedAt : (cooldownDurationMs !== null && Number.isFinite(availability.cooldownUntil) ? availability.cooldownUntil - cooldownDurationMs : null);
  const cooldownProgress = coolingDown && cooldownDurationMs !== null && cooldownStartedAt !== null ? Math.min(1, Math.max(0, (clock - cooldownStartedAt) / cooldownDurationMs)) : 0;
  const deadline = seconds(passwordChallenge?.deadlineAt, clock);
  const thumbnail = meta.thumbnail || meta.cover;
  const ready = !coolingDown && (reason === 'available' || reason === 'password_required') && availability.canTrigger === true && !locked;
  const retryableReason = reason === 'permission_denied' || reason === 'requirement_failed';
  const hardBlocked = locked || coolingDown || ['not_read', 'target_locked', 'busy', 'transitioning', 'challenge_active', 'action_hidden', 'invalid_context', 'action_not_found'].includes(reason);
  const executeDisabled = pending || interactionBlocked || hardBlocked || !(availability.canTrigger === true || retryableReason);
  const statusLabel = locked ? 'Locked' : coolingDown ? 'Wait' : (ready ? 'Ready' : (REASONS[reason] || (reason === 'requirement_failed' ? 'Requirements not met' : 'Unknown')));
  const statusTone = locked ? 'danger' : (ready ? 'success' : (REASON_TONES[reason] || 'neutral'));
  const showStatus = reason !== 'busy';

  useEffect(() => {
    const deadlines = [availability.cooldownUntil, passwordChallenge?.deadlineAt].filter(Number.isFinite);
    if (!deadlines.some(x => x > Date.now())) return undefined;
    const timer = setInterval(() => {
      const now = Date.now();
      setClock(now);
      if (!deadlines.some(x => x > now)) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [availability.cooldownUntil, passwordChallenge?.deadlineAt]);

  useEffect(() => {
    if (reason !== 'cooldown' || !Number.isFinite(availability.cooldownUntil)) return undefined;
    const timer = setTimeout(() => {
      setClock(Date.now());
      Promise.resolve(onRefreshSnapshot?.()).catch(() => {});
    }, Math.max(0, availability.cooldownUntil - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [reason, availability.cooldownUntil, onRefreshSnapshot]);

  useEffect(() => {
    setInput('');
    setPasswordFeedback(null);
  }, [passwordChallenge?.challengeId]);

  const submit = async event => {
    event.preventDefault();
    if (!input.trim() || passwordPending) return;
    setPasswordFeedback(null);
    setPasswordPending(true);
    try {
      const result = await onSubmitPassword?.(passwordChallenge, input);
      if (result?.retry) {
        setInput('');
        setPasswordFeedback('retry');
      } else if (result?.reason === 'expired' || result?.reason === 'exhausted') {
        setPasswordFeedback(result.reason);
      }
    } catch {
      return;
    } finally {
      setPasswordPending(false);
    }
  };

  const cancel = async () => {
    if (passwordPending || !passwordChallenge?.challengeId) return;
    setPasswordPending(true);
    try {
      await onCancelPassword?.(passwordChallenge);
      setInput('');
    } catch (cause) {
    } finally {
      setPasswordPending(false);
    }
  };

  const handleTrigger = async () => {
    if (executeDisabled) return;
    setFeedback(null);
    const result = await onTrigger?.(action);
    if (result?.success === true) setFeedback('success');
    else if (result?.reason === 'requirement_failed') setFeedback('requirement');
    else if (result?.reason === 'permission_denied') setFeedback('permission');
  };

  const handleDescriptionOpen = async open => {
    if (!open || !readRequired || read || !onMarkRead || pending || readRequestRef.current) return;
    readRequestRef.current = true;
    try {
      const succeeded = await onMarkRead(action);
      if (succeeded === false) readRequestRef.current = false;
    } catch (_) {
      readRequestRef.current = false;
    }
  };

  useEffect(() => {
    if (read || !readRequired) readRequestRef.current = false;
  }, [action.key, read, readRequired]);



  return <article className={`vsr-card vsr-action-card${feedback ? ` vsr-action-card--feedback-${feedback}` : ''}`} data-action-key={action.key}>
    <div className="vsr-action-card__heading">
      <h3 className="vsr-action-card__title">{meta.title || action.title || action.id}</h3>
      <Popover
        align="end"
        onOpenChange={handleDescriptionOpen}
        label="Description information"
        trigger={<Button className="vsr-action-card__info-button" variant="tertiary" size="sm" aria-label="Description information"><span className="vsr-action-card__info-glyph" aria-hidden="true">info</span></Button>}
      >
        <div className="vsr-action-card__popover">
          {description ? <p className="vsr-text-body">{description}</p> : <p className="vsr-text-secondary">No detailed description available.</p>}
        </div>
      </Popover>
    </div>

    <div className="vsr-action-card__media-wrap">
      <MediaFrame className="vsr-action-card__media" src={thumbnail?.url} type={thumbnail?.type || 'photo'} ratio={thumbnail?.ratio || '16:9'} alt={meta.title || action.title || 'Action illustration'} />
      <div className="vsr-action-card__status" aria-label="Action status">
        {showStatus && <Badge tone={statusTone}>{statusLabel}</Badge>}
        {readRequired
          ? <Badge tone={read ? 'success' : 'warning'}>{read ? 'Read' : 'Unread'}</Badge>
          : <Badge tone="neutral">Reading not required</Badge>}
      </div>
    </div>

    {coolingDown && <div className="vsr-action-card__cooldown" role="timer">Time remaining: {cooldown}s</div>}

    <div className="vsr-action-card__actions">
      <Button className={`vsr-action-card__execute-button${feedback === 'requirement' || feedback === 'permission' ? ` vsr-action-card__execute-button--feedback-${feedback}` : ''}`} size="lg" leadingIcon={meta.buttonIcon} disabled={executeDisabled} onClick={handleTrigger} aria-label={meta.buttonLabel || `Execute ${meta.title || action.id}`}>{meta.buttonLabel || 'Execute'}</Button>
    </div>

    <Dialog open={challengeOpen} onClose={cancel} title="Verify action" description={passwordChallenge?.description || 'Complete the challenge provided by the Engine.'}>
      <form className="vsr-stack vsr-stack--gap-3" onSubmit={submit}>
        {passwordChallenge?.type === 'puzzle' && passwordChallenge.puzzle?.url && <MediaFrame src={passwordChallenge.puzzle.url} ratio="1:1" alt="Puzzle challenge" />}
        {passwordChallenge?.type === 'find_way' && passwordChallenge.findWay && <div className="vsr-stack vsr-stack--gap-1"><p className="vsr-text-secondary">Grid: {passwordChallenge.findWay.area?.join(' × ') || '—'}</p><p className="vsr-text-secondary">Start: {passwordChallenge.findWay.start?.join(', ') || '—'}</p><p className="vsr-text-secondary">Target: {passwordChallenge.findWay.target?.join(', ') || '—'}</p></div>}
        <div className={`vsr-action-card__password-field${passwordFeedback ? ` vsr-action-card__password-field--${passwordFeedback}` : ''}`}>
          {structured ? <Textarea label={passwordChallenge.type === 'puzzle' ? 'Piece order (JSON)' : 'Path (coordinate JSON)'} hint={passwordChallenge.type === 'puzzle' ? 'Enter the piece-index array in row order.' : 'Enter the coordinate array [x,y], from the start point to the destination.'} rows={4} value={input} onChange={event => setInput(event.target.value)} required /> : <Input label="Password" type="password" autoComplete="current-password" value={input} onChange={event => setInput(event.target.value)} required />}
        </div>
        {Number.isFinite(passwordChallenge?.remainingAttempts) && <p className="vsr-text-secondary" role="status">Attempts remaining: {passwordChallenge.remainingAttempts}</p>}
        {deadline > 0 && <p className="vsr-text-secondary" role="status">Time remaining: {deadline}s</p>}
        <Grid columns="auto" gap="2"><Button size="lg" type="button" variant="secondary" disabled={passwordPending} onClick={cancel}>Cancel challenge</Button><Button size="lg" type="submit" disabled={!input.trim() || passwordPending} loading={passwordPending}>Submit response</Button></Grid>
      </form>
    </Dialog>
    {coolingDown && <div className="vsr-action-card__cooldown-progress"><ProgressBar status="determinate" value={Math.round(cooldownProgress * 100)} label="Cooldown progress" /></div>}
  </article>;
}

export default memo(ActionCard);
