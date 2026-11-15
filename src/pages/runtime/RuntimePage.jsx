import React, { useState } from 'react';
import { Button } from '../../design-system/index.js';
import './RuntimePage.css';

export default function RuntimePage({ client, snapshot, onExit }) {
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const actions = snapshot?.presentation?.actions || [];
  const scene = snapshot?.presentation?.scene;
  const router = snapshot?.presentation?.router;

  async function trigger(action) {
    if (pendingAction) return;
    const uniqueId = [snapshot.game.sceneId, snapshot.game.routerId, action.id].join('_');
    setPendingAction(action.id);
    setError('');
    try {
      await client.triggerAction(action.id, uniqueId);
    } catch (cause) {
      setError(cause?.message || 'Engine từ chối thao tác.');
    } finally {
      setPendingAction('');
    }
  }

  return (
    <main className="runtime-page">
      <header className="runtime-header">
        <div className="runtime-header__identity">
          <span className="runtime-header__eyebrow">VSR RUNTIME</span>
          <h1>{snapshot.presentation?.scenarioTitle || 'Interactive Story'}</h1>
        </div>
        <Button variant="secondary" size="md" onClick={onExit}>Thoát kịch bản</Button>
      </header>

      <section className="runtime-scene" aria-live="polite">
        <p className="runtime-scene__eyebrow">SCENE · {scene?.id || '—'} / ROUTER · {router?.id || '—'}</p>
        <h2>{scene?.meta?.title || 'Scene chưa có tiêu đề'}</h2>
        {(scene?.meta?.desc || scene?.meta?.description) && (
          <p className="runtime-scene__description">{scene.meta.desc || scene.meta.description}</p>
        )}
        {router?.meta?.desc && <p className="runtime-router-description">{router.meta.desc}</p>}
      </section>

      <section className="runtime-actions" aria-labelledby="runtime-actions-title">
        <div className="runtime-actions__heading">
          <h2 id="runtime-actions-title">Hành động</h2>
          <span>{actions.length} lựa chọn</span>
        </div>
        {actions.length ? actions.map(action => (
          <Button
            key={action.id}
            className="runtime-action"
            variant="secondary"
            size="lg"
            onClick={() => trigger(action)}
            disabled={Boolean(pendingAction)}
            loading={pendingAction === action.id}
          >
            <span className="runtime-action__copy">
              <strong>{action.title || action.name || action.id}</strong>
              {action.meta?.desc && <small>{action.meta.desc}</small>}
            </span>
          </Button>
        )) : <p className="runtime-empty">Scene hiện tại không có action khả dụng.</p>}
        {error && <p className="runtime-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
