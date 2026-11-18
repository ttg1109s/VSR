import React, { useEffect, useMemo, useState } from 'react';
import { Badge, BottomNavigation, Breadcrumb, MediaFrame } from '../../design-system/index.js';
import ActionCollection from '../../features/actions/ActionCollection.jsx';
import Liên hệPanel from './Liên hệPanel.jsx';

export default function PlayingPage({ snapshot, chatViewRequest = null, client, error = '', onNavigate }) {
  const [activeNavigation, setActiveNavigation] = useState('hand');
  const [contactOpen, setLiên hệOpen] = useState(false);
  const scene = snapshot?.presentation?.scene ?? null;
  const router = snapshot?.presentation?.router ?? null;
  const activeSceneId = snapshot?.game?.sceneId ?? null;

  const activeChat = snapshot?.session?.chat ?? null;
  useEffect(() => {
    if (activeChat?.active !== true || !activeChat.id || !activeChat.contactId) return;
    setLiên hệOpen(true);
    setActiveNavigation('contact');
  }, [activeChat?.active, activeChat?.id, activeChat?.contactId]);

  useEffect(() => {
    if (!chatViewRequest?.requestId || !chatViewRequest.chatId || !chatViewRequest.contactId) return;
    setLiên hệOpen(true);
    setActiveNavigation('contact');
  }, [chatViewRequest?.requestId, chatViewRequest?.chatId, chatViewRequest?.contactId]);

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
        aria-label="Đường dẫn cảnh"
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
        <ActionCollection
          actions={snapshot?.presentation?.actions || []}
          client={client}
          sceneId={activeSceneId}
          passwordChallenge={snapshot?.session?.passwordChallenge || null}
          onError={() => {}}
        />
        {error && <p className="vsr-text-error" role="alert">{error}</p>}
      </article>
      <BottomNavigation
        value={activeNavigation}
        onChange={value => {
          setActiveNavigation(value);
          if (value === 'contact') setLiên hệOpen(true);
        }}
        items={[
          { value: 'hand', label: 'Đồ đang cầm', icon: 'front_hand' },
          { value: 'inventor', label: 'Vật phẩm', icon: 'inventory_2' },
          { value: 'contact', label: 'Liên hệ', icon: 'contacts' },
          { value: 'notify', label: 'Thông báo', icon: 'notifications' }
        ]}
      />
      <Liên hệPanel
        open={contactOpen}
        player={snapshot?.presentation?.player ?? null}
        contacts={snapshot?.presentation?.contacts ?? []}
        systemLiên hệs={snapshot?.presentation?.systemLiên hệs ?? []}
        session={snapshot?.session ?? null}
        viewRequest={chatViewRequest}
        client={client}
        onClose={() => {
          setLiên hệOpen(false);
          setActiveNavigation('hand');
        }}
      />
    </main>
  );
}
