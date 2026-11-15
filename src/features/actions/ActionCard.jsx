import React, { memo, useEffect, useState } from 'react';
import { Badge, Button, Dialog, Grid, Input, MediaFrame, Textarea } from '../../design-system/index.js';

const REASONS = {
  locked: 'Đang khóa',
  permission_denied: 'Không đủ quyền',
  not_read: 'Cần đọc mô tả',
  cooldown: 'Đang hồi chiêu',
  requirement_failed: 'Chưa đủ điều kiện',
  target_locked: 'Đích đang khóa',
  busy: 'Engine đang xử lý',
  password_required: 'Cần xác thực',
};
const REASON_TONES = {
  locked: 'danger', permission_denied: 'danger', target_locked: 'danger',
  requirement_failed: 'warning', not_read: 'warning', cooldown: 'warning',
  busy: 'info', password_required: 'info', available: 'success',
};
const seconds = (until, now) => Number.isFinite(until) ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;

function ActionCard({ action, pending = false, passwordChallenge = null, feedback = '', onTrigger, onMarkRead, onSubmitPassword, onCancelPassword }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [challengeFeedback, setChallengeFeedback] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);
  const [clock, setClock] = useState(Date.now());
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
  const deadline = seconds(passwordChallenge?.deadlineAt, clock);
  const thumbnail = meta.thumbnail || meta.cover;
  const ready = reason === 'available' && availability.canTrigger === true && !locked;
  const statusLabel = pending ? 'Đang xử lý' : locked ? 'Đang khóa' : (REASONS[reason] || (ready ? 'Sẵn sàng' : 'Chưa xác định'));
  const statusTone = pending ? 'info' : locked ? 'danger' : (REASON_TONES[reason] || (ready ? 'success' : 'neutral'));

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
        setChallengeFeedback(result.remainingAttempts === null ? 'Thông tin chưa chính xác. Có thể thử lại.' : `Thông tin chưa chính xác. Còn ${result.remainingAttempts} lượt thử.`);
        setInput('');
      } else if (result?.reason === 'expired') setError('Thử thách đã hết thời gian.');
      else if (result?.reason === 'exhausted') setError('Đã hết số lượt thử.');
      else if (result?.reason === 'revision_conflict') setError('Trạng thái vừa thay đổi. Hãy kiểm tra lại thử thách.');
    } catch (cause) {
      setError(cause?.message || 'Không thể gửi câu trả lời.');
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
      setError(cause?.message || 'Không thể hủy thử thách.');
    } finally {
      setPasswordPending(false);
    }
  };

  const markRead = async () => {
    if (!onMarkRead || pending) return;
    await onMarkRead(action);
    setDetailsOpen(false);
  };

  // The Engine's reason precedence lets the UI identify confirmed checks without re-evaluating requirements.
  const permissionPassed = ['available', 'cooldown', 'requirement_failed', 'target_locked', 'password_required'].includes(reason);
  const requirementPassed = ['available', 'cooldown', 'target_locked', 'password_required'].includes(reason);
  const conditionText = requirementPassed ? 'Điều kiện thực hiện đã đáp ứng' : reason === 'requirement_failed' ? 'Điều kiện thực hiện chưa đáp ứng' : 'Chưa xác định điều kiện thực hiện';
  const permissionText = permissionPassed ? 'Nhân vật có quyền thực hiện' : reason === 'permission_denied' ? 'Nhân vật không có quyền thực hiện' : 'Chưa xác định quyền thực hiện';

  return <article className="vsr-card vsr-action-card" data-action-key={action.key} aria-busy={pending || undefined}>
    <div className="vsr-action-card__heading">
      <h3 className="vsr-action-card__title">{meta.title || action.title || action.id}</h3>
      <div className="vsr-action-card__status" aria-label="Trạng thái hành động">
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </div>
    </div>

    <MediaFrame className="vsr-action-card__media" src={thumbnail?.url} type={thumbnail?.type || 'photo'} ratio={thumbnail?.ratio || '16:9'} alt={meta.title || action.title || 'Hình minh họa hành động'} />

    <div className="vsr-action-card__section vsr-action-card__description-section">
      <div className="vsr-action-card__section-heading">
        <Button className="vsr-action-card__info-button" variant="tertiary" size="sm" leadingIcon="info" aria-label="Thông tin mô tả" onClick={() => setDetailsOpen(true)} />
        {readRequired
          ? <Badge tone={read ? 'success' : 'warning'}>{read ? 'Đã đọc' : 'Chưa đọc'}</Badge>
          : <Badge tone="neutral">Không yêu cầu đọc</Badge>}
      </div>
    </div>

    <div className="vsr-action-card__section vsr-action-card__requirements">
      <h4>Điều kiện và quyền</h4>
      <div className="vsr-action-card__requirement-state">
        <span className={'vsr-action-card__state-icon ' + (requirementPassed ? 'is-success' : 'is-muted')} aria-hidden="true">{requirementPassed ? 'check_circle' : 'info'}</span>
        <span>{conditionText}</span>
      </div>
      <div className="vsr-action-card__requirement-state">
        <span className={'vsr-action-card__state-icon vsr-action-card__permission-icon ' + (permissionPassed ? 'is-success' : 'is-muted')} aria-hidden="true">{permissionPassed ? 'verified_user' : 'shield'}</span>
        <span>{permissionText}</span>
      </div>
      {reason === 'cooldown' && <div className="vsr-action-card__cooldown" role="timer">Thời gian còn lại: {cooldown} giây</div>}
    </div>

    {feedback && <p className="vsr-action-card__feedback" role="status">{feedback}</p>}
    <div className="vsr-action-card__actions">
      <Button size="lg" leadingIcon={meta.buttonIcon} disabled={pending || availability.canTrigger !== true || locked} loading={pending} onClick={() => onTrigger?.(action)} aria-label={meta.buttonLabel || `Thực hiện ${meta.title || action.id}`}>{meta.buttonLabel || (reason === 'password_required' ? 'Xác thực' : 'Thực hiện')}</Button>
    </div>

    <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} title={meta.title || action.title || action.id} description="Thông tin chi tiết của hành động">
      <div className="vsr-stack vsr-stack--gap-3">
        {description ? <p className="vsr-text-body">{description}</p> : <p className="vsr-text-secondary">Không có mô tả chi tiết.</p>}
        {readRequired && !read && <Button onClick={markRead} disabled={pending}>Xác nhận đã đọc</Button>}
        {readRequired && read && <p className="vsr-text-secondary" role="status">Bạn đã xác nhận đọc mô tả này.</p>}
      </div>
    </Dialog>
    <Dialog open={challengeOpen} onClose={cancel} title="Xác thực hành động" description={passwordChallenge?.description || 'Trả lời thử thách do Engine cung cấp.'}>
      <form className="vsr-stack vsr-stack--gap-3" onSubmit={submit}>
        {passwordChallenge?.type === 'puzzle' && passwordChallenge.puzzle?.url && <MediaFrame src={passwordChallenge.puzzle.url} ratio="1:1" alt="Hình thử thách xếp mảnh" />}
        {passwordChallenge?.type === 'find_way' && passwordChallenge.findWay && <div className="vsr-stack vsr-stack--gap-1"><p className="vsr-text-secondary">Lưới: {passwordChallenge.findWay.area?.join(' × ') || '—'}</p><p className="vsr-text-secondary">Bắt đầu: {passwordChallenge.findWay.start?.join(', ') || '—'}</p><p className="vsr-text-secondary">Đích: {passwordChallenge.findWay.target?.join(', ') || '—'}</p></div>}
        {structured ? <Textarea label={passwordChallenge.type === 'puzzle' ? 'Thứ tự mảnh ghép (JSON)' : 'Đường đi (JSON tọa độ)'} hint={passwordChallenge.type === 'puzzle' ? 'Nhập mảng chỉ số mảnh theo thứ tự hàng.' : 'Nhập mảng tọa độ [x,y], từ điểm đầu đến điểm đích.'} rows={4} value={input} onChange={event => setInput(event.target.value)} required /> : <Input label="Mật khẩu" type="password" autoComplete="current-password" value={input} onChange={event => setInput(event.target.value)} required />}
        {Number.isFinite(passwordChallenge?.remainingAttempts) && <p className="vsr-text-secondary" role="status">Số lượt còn lại: {passwordChallenge.remainingAttempts}</p>}
        {deadline > 0 && <p className="vsr-text-secondary" role="status">Thời gian còn lại: {deadline} giây</p>}
        {challengeFeedback && <p role="status">{challengeFeedback}</p>}
        {error && <p className="vsr-text-error" role="alert">{error}</p>}
        <Grid columns="auto" gap="2"><Button size="lg" type="button" variant="secondary" disabled={passwordPending} onClick={cancel}>Hủy thử thách</Button><Button size="lg" type="submit" disabled={!input.trim() || passwordPending} loading={passwordPending}>Gửi câu trả lời</Button></Grid>
      </form>
    </Dialog>
  </article>;
}

export default memo(ActionCard);
