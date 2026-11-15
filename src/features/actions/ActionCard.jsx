import React, { memo, useMemo, useState } from 'react';
import { Badge, Button, Dialog, Input, MediaFrame } from '../../design-system/index.js';

const REASON_LABELS = {
  locked: 'Đang khóa',
  permission_denied: 'Không đủ quyền',
  not_read: 'Cần đọc mô tả',
  cooldown: 'Đang hồi chiêu',
  requirement_failed: 'Chưa đủ điều kiện',
  target_locked: 'Đích đang khóa',
  busy: 'Engine đang xử lý',
  password_required: 'Cần xác thực',
  unknown: 'Không xác định'
};

function formatRemaining(until) {
  if (!Number.isFinite(until)) return '';
  const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  return seconds > 0 ? `Còn ${seconds} giây` : '';
}

function ActionCard({ action, pending = false, passwordChallenge = null, onTrigger, onMarkRead, onSubmitPassword }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const meta = action.meta || {};
  const presentation = action.presentation || {};
  const availability = action.availability || { canTrigger: true, reason: 'available' };
  const description = meta.description || meta.desc || '';
  const locked = presentation.display === 'locked' || availability.reason === 'locked';
  const canRead = presentation.readRequired && !presentation.read;
  const media = meta.thumbnail || meta.cover;
  const statusLabel = locked ? 'Đang khóa' : canRead ? 'Chưa đọc' : REASON_LABELS[availability.reason];
  const cooldown = useMemo(() => formatRemaining(availability.cooldownUntil), [availability.cooldownUntil]);
  const triggerDisabled = pending || !availability.canTrigger || locked;
  const passwordOpen = !!passwordChallenge && passwordChallenge.uniqueId === action.key;

  const handleTrigger = async () => {
    if (triggerDisabled) return;
    await onTrigger?.(action);
  };

  return (
    <article className={['vsr-action-card', locked && 'is-locked'].filter(Boolean).join(' ')} data-action-key={action.key}>
      <div className="vsr-action-card__media">
        <MediaFrame
          src={media?.url}
          type={media?.type || 'photo'}
          ratio={media?.ratio || '16:9'}
          alt={meta.title || action.title || 'Action'}
        />
        {statusLabel && <div className="vsr-action-card__badge"><Badge tone={locked ? 'danger' : canRead ? 'warning' : 'neutral'}>{statusLabel}</Badge></div>}
      </div>
      <div className="vsr-action-card__content">
        <div className="vsr-action-card__heading">
          <h3>{meta.title || action.title || action.id}</h3>
          {meta.subTitleStatus && <p className="vsr-action-card__subtitle">{meta.subTitleStatus}</p>}
        </div>
        {description && <p className="vsr-action-card__description">{description}</p>}
        {(availability.reason !== 'available' && availability.reason !== 'password_required') && (
          <p className="vsr-action-card__reason" role="status">
            {availability.reason === 'cooldown' ? (cooldown || 'Đang hồi chiêu') : (REASON_LABELS[availability.reason] || '')}
          </p>
        )}
        <div className="vsr-action-card__footer">
          {canRead && (
            <Button variant="secondary" size="md" disabled={pending} onClick={() => setDetailsOpen(true)}>
              Đọc mô tả
            </Button>
          )}
          <Button
            size="md"
            disabled={triggerDisabled}
            loading={pending}
            onClick={handleTrigger}
            aria-label={meta.buttonLabel || `Thực hiện ${meta.title || action.id}`}
          >
            {meta.buttonLabel || (availability.reason === 'password_required' ? 'Xác thực' : 'Thực hiện')}
          </Button>
        </div>
      </div>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={meta.title || action.title || action.id}
        description="Thông tin chi tiết của hành động"
        size="md"
      >
        <div className="vsr-action-card__details">{description || 'Không có mô tả chi tiết.'}</div>
        {canRead && (
          <div className="vsr-action-card__dialog-actions">
            <Button onClick={async () => { await onMarkRead?.(action); setDetailsOpen(false); }}>
              Đã đọc mô tả
            </Button>
          </div>
        )}
      </Dialog>

      <Dialog
        open={passwordOpen}
        onClose={() => { setPassword(''); setPasswordError(''); }}
        title="Xác thực hành động"
        description="Nhập thông tin xác thực theo yêu cầu của kịch bản."
      >
        <form className="vsr-action-card__password-form" onSubmit={async event => {
          event.preventDefault();
          setPasswordError('');
          try {
            await onSubmitPassword?.(passwordChallenge, password);
            setPassword('');
          } catch (error) {
            setPasswordError(error?.message || 'Không thể xác thực.');
          }
        }}>
          <Input label="Mật khẩu" type="text" value={password} onChange={event => setPassword(event.target.value)} autoComplete="off" />
          {passwordError && <p className="vsr-text-error" role="alert">{passwordError}</p>}
          <Button type="submit" disabled={!password.trim()}>Gửi xác thực</Button>
        </form>
      </Dialog>
    </article>
  );
}

export default memo(ActionCard);
