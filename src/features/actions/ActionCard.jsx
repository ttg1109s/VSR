import React, { memo, useEffect, useRef, useState } from 'react';
import { Badge, Button, Dialog, Grid, Input, MediaFrame, Popover, Textarea } from '../../design-system/index.js';

const REASONS = {
  locked: 'Locked',
  permission_denied: 'Permission denied',
  not_read: 'Read description',
  cooldown: 'On cooldown',
  requirement_failed: 'Requirements not met',
  requirement_unavailable: 'Requirement evaluation unavailable',
  target_locked: 'Target is locked',
  password_required: 'Ready',
  challenge_active: 'Complete the active password challenge',
};
const REASON_TONES = {
  locked: 'danger', permission_denied: 'danger', target_locked: 'danger',
  requirement_failed: 'warning', not_read: 'warning', cooldown: 'warning',
  password_required: 'info', challenge_active: 'info', requirement_unavailable: 'info', available: 'success',
};
const seconds = (until, now) => Number.isFinite(until) ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;

function ActionCard({ action, pending = false, interactionBlocked = false, passwordChallenge = null, feedback = '', onTrigger, onMarkRead, onSubmitPassword, onCancelPassword, onRefreshSnapshot }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [challengeFeedback, setChallengeFeedback] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
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
  const statusLabel = locked ? 'Locked' : coolingDown ? 'Wait' : (ready ? 'Ready' : (REASONS[reason] || 'Unknown'));
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
    setError('');
    setChallengeFeedback('');
  }, [passwordChallenge?.challengeId]);

  const submit = async event => {
    event.preventDefault();
    if (!input.trim() || passwordPending) return;
    setPasswordPending(true);
    setError('');
    setChallengeFeedback('');
    try {
      const result = await onSubmitPassword?.(passwordChallenge, input);
      if (result?.retry) {
        setChallengeFeedback(result.remainingAttempts === null ? 'Incorrect response. You can try again.' : `Incorrect response. ${result.remainingAttempts} attempts remaining.`);
        setInput('');
      } else if (result?.reason === 'expired') setError('The challenge has expired.');
      else if (result?.reason === 'exhausted') setError('No attempts remaining.');
      else if (result?.reason === 'revision_conflict') setError(result.message || 'The state has changed. Please review the challenge.');
      else if (result?.error || result?.message) setError(result.message || 'Unable to verify the challenge.');
      else if (result?.success === false && !result?.retry) setError('The Engine rejected the response. Please review the challenge.');
      else if (!result) setError('No verification response was received from the Engine.');
    } catch (cause) {
      setError(cause?.message || 'Unable to submit the response.');
    } finally {
      setPasswordPending(false);
    }
  };

  const cancel = async () => {
    if (passwordPending || !passwordChallenge?.challengeId) return;
    setPasswordPending(true);
    setError('');
    try {
      await onCancelPassword?.(passwordChallenge);
      setInput('');
    } catch (cause) {
      setError(cause?.message || 'Unable to cancel the challenge.');
    } finally {
      setPasswordPending(false);
    }
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

  const checks = availability.checks || {};
  const permissionPassed = checks.permission === 'passed';
  const permissionFailed = checks.permission === 'failed';
  const requirementPassed = checks.requirement === 'passed' || checks.requirement === 'not_required';
  const requirementFailed = checks.requirement === 'failed';
  const conditionText = requirementPassed
    ? 'Requirements satisfied'
    : requirementFailed ? 'Requirements not satisfied' : 'Requirement status unknown';
  const permissionText = permissionPassed
    ? 'Character has permission to perform this action'
    : permissionFailed ? 'Character does not have permission to perform this action' : 'Permission status unknown';

  return <article className="vsr-card vsr-action-card" data-action-key={action.key}>
    <div className="vsr-action-card__heading">
      <h3 className="vsr-action-card__title">{meta.title || action.title || action.id}</h3>
      <div className="vsr-action-card__status" aria-label="Action status">
        {showStatus && <Badge tone={statusTone}>{statusLabel}</Badge>}
      </div>
    </div>

    <MediaFrame className="vsr-action-card__media" src={thumbnail?.url} type={thumbnail?.type || 'photo'} ratio={thumbnail?.ratio || '16:9'} alt={meta.title || action.title || 'Action illustration'} />

    <div className="vsr-action-card__section vsr-action-card__description-section">
      <div className="vsr-action-card__section-heading">
        <Popover
          align="start"
          onOpenChange={handleDescriptionOpen}
          label="Description information"
          trigger={<Button className="vsr-action-card__info-button" variant="tertiary" size="sm" aria-label="Description information"><span className="vsr-action-card__info-glyph" aria-hidden="true">info</span></Button>}
        >
          <div className="vsr-action-card__popover">
            {description ? <p className="vsr-text-body">{description}</p> : <p className="vsr-text-secondary">No detailed description available.</p>}
          </div>
        </Popover>
        {readRequired
          ? <Badge tone={read ? 'success' : 'warning'}>{read ? 'Read' : 'Unread'}</Badge>
          : <Badge tone="neutral">Reading not required</Badge>}
      </div>
    </div>

    <div className="vsr-action-card__section vsr-action-card__requirements">
      <h4>Requirements and permissions</h4>
      <div className="vsr-action-card__requirement-state">
        <span className={'vsr-action-card__state-icon ' + (requirementPassed ? 'is-success' : requirementFailed ? 'is-error' : 'is-muted')} aria-hidden="true">{requirementPassed ? 'check_circle' : requirementFailed ? 'cancel' : 'info'}</span>
        <span>{conditionText}</span>
      </div>
      <div className="vsr-action-card__requirement-state">
        <span className={'vsr-action-card__state-icon vsr-action-card__permission-icon ' + (permissionPassed ? 'is-success' : permissionFailed ? 'is-error' : 'is-muted')} aria-hidden="true">{permissionPassed ? 'verified_user' : 'shield'}</span>
        <span>{permissionText}</span>
      </div>
      {coolingDown && <div className="vsr-action-card__cooldown" role="timer">Time remaining: {cooldown}s</div>}
    </div>

    {feedback && <p className="vsr-action-card__feedback" role="status">{feedback}</p>}
    <div className="vsr-action-card__actions">
      <Button size="lg" leadingIcon={meta.buttonIcon} disabled={pending || interactionBlocked || coolingDown || !ready || availability.canTrigger !== true || locked} onClick={() => onTrigger?.(action)} aria-label={meta.buttonLabel || `Execute ${meta.title || action.id}`}>{meta.buttonLabel || 'Execute'}</Button>
    </div>

    <Dialog open={challengeOpen} onClose={cancel} title="Verify action" description={passwordChallenge?.description || 'Complete the challenge provided by the Engine.'}>
      <form className="vsr-stack vsr-stack--gap-3" onSubmit={submit}>
        {passwordChallenge?.type === 'puzzle' && passwordChallenge.puzzle?.url && <MediaFrame src={passwordChallenge.puzzle.url} ratio="1:1" alt="Puzzle challenge" />}
        {passwordChallenge?.type === 'find_way' && passwordChallenge.findWay && <div className="vsr-stack vsr-stack--gap-1"><p className="vsr-text-secondary">Grid: {passwordChallenge.findWay.area?.join(' × ') || '—'}</p><p className="vsr-text-secondary">Start: {passwordChallenge.findWay.start?.join(', ') || '—'}</p><p className="vsr-text-secondary">Target: {passwordChallenge.findWay.target?.join(', ') || '—'}</p></div>}
        {structured ? <Textarea label={passwordChallenge.type === 'puzzle' ? 'Piece order (JSON)' : 'Path (coordinate JSON)'} hint={passwordChallenge.type === 'puzzle' ? 'Enter the piece-index array in row order.' : 'Enter the coordinate array [x,y], from the start point to the destination.'} rows={4} value={input} onChange={event => setInput(event.target.value)} required /> : <Input label="Password" type="password" autoComplete="current-password" value={input} onChange={event => setInput(event.target.value)} required />}
        {Number.isFinite(passwordChallenge?.remainingAttempts) && <p className="vsr-text-secondary" role="status">Attempts remaining: {passwordChallenge.remainingAttempts}</p>}
        {deadline > 0 && <p className="vsr-text-secondary" role="status">Time remaining: {deadline}s</p>}
        {challengeFeedback && <p role="status">{challengeFeedback}</p>}
        {error && <p className="vsr-text-error" role="alert">{error}</p>}
        <Grid columns="auto" gap="2"><Button size="lg" type="button" variant="secondary" disabled={passwordPending} onClick={cancel}>Cancel challenge</Button><Button size="lg" type="submit" disabled={!input.trim() || passwordPending} loading={passwordPending}>Submit response</Button></Grid>
      </form>
    </Dialog>
    {coolingDown && <div className="vsr-action-card__cooldown-progress" role="progressbar" aria-label="Cooldown progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(cooldownProgress * 100)}><span style={{ width: `${cooldownProgress * 100}%` }} /></div>}
  </article>;
}

export default memo(ActionCard);
