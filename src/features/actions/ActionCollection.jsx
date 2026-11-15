import React, { useCallback, useMemo, useState } from 'react';
import { Grid } from '../../design-system/index.js';
import ActionCard from './ActionCard.jsx';

const RESULT_MESSAGES = {
  action_hidden: 'Hành động hiện không hiển thị.',
  locked: 'Hành động đang bị khóa.',
  permission_denied: 'Nhân vật hiện tại không có quyền thực hiện.',
  not_read: 'Cần đọc mô tả trước khi thực hiện.',
  cooldown: 'Hành động đang trong thời gian hồi chiêu.',
  requirement_failed: 'Chưa đáp ứng điều kiện thực hiện.',
  target_locked: 'Đích đang bị khóa.',
  busy: 'Engine đang xử lý một thao tác khác.'
};

export default function ActionCollection({ actions = [], client, onError }) {
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  const [feedback, setFeedback] = useState({});
  const orderedActions = useMemo(() => Array.isArray(actions) ? actions : [], [actions]);

  const markPending = useCallback((key, pending) => {
    setPendingKeys(current => {
      const next = new Set(current);
      pending ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  const handleTrigger = useCallback(async (action, options = {}) => {
    if (!client) return;
    const key = action.key;
    markPending(key, true);
    setFeedback(current => ({ ...current, [key]: '' }));
    try {
      const ack = await client.triggerAction(action.id, action.key);
      const result = ack?.result;
      if (result?.reason === 'password_required' || result?.challengeId) return result;
      if (result?.success === false) {
        const message = RESULT_MESSAGES[result.reason] || 'Hành động chưa được thực hiện.';
        setFeedback(current => ({ ...current, [key]: message }));
        return result;
      }
      return result;
    } catch (error) {
      const message = error?.message || 'Không thể gửi lệnh đến Engine.';
      setFeedback(current => ({ ...current, [key]: message }));
      onError?.(message);
      throw error;
    } finally {
      markPending(key, false);
    }
  }, [client, markPending, onError]);

  const handleRead = useCallback(async action => {
    if (!client) return;
    markPending(action.key, true);
    try {
      await client.markActionRead(action.key);
    } catch (error) {
      onError?.(error?.message || 'Không thể cập nhật trạng thái đọc.');
    } finally {
      markPending(action.key, false);
    }
  }, [client, markPending, onError]);

  if (!orderedActions.length) {
    return <section className="vsr-action-collection vsr-action-collection--empty" aria-label="Hành động">
      <p>Không có hành động khả dụng trong ngữ cảnh hiện tại.</p>
    </section>;
  }

  return (
    <section className="vsr-action-collection" aria-label="Hành động">
      <header className="vsr-action-collection__header">
        <h2>Hành động</h2>
        <span>{orderedActions.length}</span>
      </header>
      <Grid columns="auto" gap="4" className="vsr-action-collection__grid">
        {orderedActions.map(action => (
          <div key={action.key || action.id} className="vsr-action-collection__item">
            <ActionCard
              action={action}
              pending={pendingKeys.has(action.key)}
              onTrigger={handleTrigger}
              onMarkRead={handleRead}
            />
            {feedback[action.key] && <p className="vsr-action-collection__feedback" role="status">{feedback[action.key]}</p>}
          </div>
        ))}
      </Grid>
    </section>
  );
}
