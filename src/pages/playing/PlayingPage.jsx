import React, { useMemo, useState } from 'react';

function SceneBreadcrumb({ path, activeSceneId, onNavigate }) {
  return (
    <nav className="vsr-playing-breadcrumb" aria-label="Scene navigation">
      {path.map((scene, index) => {
        const active = scene.id === activeSceneId;
        return (
          <React.Fragment key={scene.id}>
            {index > 0 && <span className="vsr-playing-breadcrumb__separator" aria-hidden="true">›</span>}
            <button
              type="button"
              className={`vsr-playing-breadcrumb__item${active ? ' active' : ''}`}
              aria-current={active ? 'page' : undefined}
              disabled={active}
              onClick={() => onNavigate?.(scene.id)}
            >
              {scene.title || scene.id}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

function SceneRouterCover({ cover, status }) {
  const [failedUrl, setFailedUrl] = useState('');
  const url = typeof cover?.url === 'string' ? cover.url : '';
  const hasMedia = Boolean(url) && failedUrl !== url;
  const isVideo = cover?.type === 'video';

  return (
    <div className="vsr-playing-cover">
      {hasMedia ? (
        isVideo ? (
          <video
            key={url}
            className="vsr-playing-cover__media"
            src={url}
            autoPlay
            muted
            loop
            playsInline
            onError={() => setFailedUrl(url)}
          />
        ) : (
          <img
            key={url}
            className="vsr-playing-cover__media"
            src={url}
            alt=""
            onError={() => setFailedUrl(url)}
          />
        )
      ) : (
        <div className="vsr-playing-cover__placeholder" aria-hidden="true">
          <span className="vsr-icon">image</span>
        </div>
      )}
      {status && <span className="vsr-playing-cover__status vsr-eyebrow">{status}</span>}
    </div>
  );
}

export default function PlayingPage({ snapshot, error = '', onNavigate }) {
  const scenePath = useMemo(() => {
    const path = snapshot?.presentation?.scenePath;
    if (Array.isArray(path) && path.length) return path;
    const scene = snapshot?.presentation?.scene;
    return scene ? [{ id: scene.id, title: scene.meta?.title || scene.id }] : [];
  }, [snapshot?.presentation?.scenePath, snapshot?.presentation?.scene]);

  const scene = snapshot?.presentation?.scene;
  const router = snapshot?.presentation?.router;
  const sceneCover = scene?.meta?.cover;
  const routerCover = router?.meta?.cover;
  const cover = routerCover?.url ? routerCover : sceneCover;
  const sceneDescription = scene?.meta?.desc;
  const routerDescription = router?.meta?.desc;
  const routerStatus = router?.meta?.subTitleStatus;

  return (
    <main className="vsr-page-shell vsr-page-shell--start vsr-playing-shell">
      <SceneBreadcrumb
        path={scenePath}
        activeSceneId={snapshot?.game?.sceneId}
        onNavigate={onNavigate}
      />
      <article className="vsr-playing-content">
        {sceneDescription && (
          <section aria-label="Scene description">
            <p className="vsr-playing-description">{sceneDescription}</p>
          </section>
        )}
        <SceneRouterCover cover={cover} status={routerStatus} />
        {routerDescription && (
          <section aria-label="Router description">
            <p className="vsr-playing-description">{routerDescription}</p>
          </section>
        )}
        {error && <p className="vsr-playing-error" role="alert">{error}</p>}
      </article>
    </main>
  );
}
