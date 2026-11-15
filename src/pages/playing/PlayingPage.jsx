import React, { useMemo } from 'react';
import { Badge, Breadcrumb, MediaFrame } from '../../design-system/index.js';

export default function PlayingPage({ snapshot, error = '', onNavigate }) {
  const scene = snapshot?.presentation?.scene ?? null;
  const router = snapshot?.presentation?.router ?? null;
  const activeSceneId = snapshot?.game?.sceneId ?? null;

  const scenePath = useMemo(() => {
    const path = snapshot?.presentation?.scenePath;
    if (Array.isArray(path) && path.length) return path;
    return scene ? [{ id: scene.id, title: scene.meta?.title || scene.id }] : [];
  }, [snapshot?.presentation?.scenePath, scene]);

  const breadcrumbItems = useMemo(() => scenePath.map(item => ({
    key: item.id,
    label: item.title || item.id,
    onClick: () => onNavigate?.(item.id)
  })), [scenePath, onNavigate]);

  const routerCover = router?.meta?.cover;
  const sceneCover = scene?.meta?.cover;
  const cover = routerCover?.url ? routerCover : sceneCover;
  const status = typeof router?.meta?.subTitleStatus === 'string' && router.meta.subTitleStatus.trim()
    ? router.meta.subTitleStatus.trim()
    : 'Chưa thiết lập trạng thái';

  return (
    <main className="vsr-page-shell vsr-page-shell--start vsr-page-shell--flush-top">
      <Breadcrumb
        items={breadcrumbItems}
        activeKey={activeSceneId}
        separator="›"
        scrollable
        sticky
        aria-label="Scene breadcrumb"
      />
      <article className="vsr-page-shell__content vsr-page-shell__content--reading">
        {scene?.meta?.desc && (
          <div className="vsr-text-body">{scene.meta.desc}</div>
        )}
        <MediaFrame
          src={cover?.url}
          type={cover?.type || 'photo'}
          ratio={cover?.ratio || '16:9'}
          overlay={<Badge tone="neutral">{status}</Badge>}
        />
        {router?.meta?.desc && (
          <div className="vsr-text-body">{router.meta.desc}</div>
        )}
        {error && <p className="vsr-text-error" role="alert">{error}</p>}
      </article>
    </main>
  );
}
