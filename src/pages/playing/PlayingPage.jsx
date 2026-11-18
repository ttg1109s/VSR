import React, { useEffect, useMemo, useState } from 'react';
import { Badge, BottomNavigation, Breadcrumb, MediaFrame } from '../../design-system/index.js';
import ActionCollection from '../../features/actions/ActionCollection.jsx';
import ContactPanel from './ContactPanel.jsx';

export default function PlayingPage({ snapshot, chatViewRequest = null, client, error = '', onNavigate }) {
  const [activeNavigation, setActiveNavigation] = useState('hand');
  const [contactOpen, setContactOpen] = useState(false);
  const scene = snapshot?.presentation?.scene ?? null;
  const router = snapshot?.presentation?.router ?? null;
  const activeSceneId = snapshot?.game?.sceneId ?? null;

  const activeChat = snapshot?.session?.chat ?? null;
  useEffect(() => {
    if (activeChat?.active !== true || !activeChat.id || !activeChat.contactId) return;
    setContactOpen(true);
    setActiveNavigation('contact');
  }, [activeChat?.active, activeChat?.id, activeChat?.contactId]);

  useEffect(() => {
    if (!chatViewRequest?.requestId || !chatViewRequest.chatId || !chatViewRequest.contactId) return;
    setContactOpen(true);
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
    : 'Status not set';

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
          if (value === 'contact') setContactOpen(true);
        }}
        items={[
          { value: 'hand', label: 'Hand', icon: 'front_hand' },
          { value: 'inventor', label: 'Inventor', icon: 'inventory_2' },
          { value: 'contact', label: 'Contact', icon: 'contacts' },
          { value: 'notify', label: 'Notify', icon: 'notifications' }
        ]}
      />
      <ContactPanel
        open={contactOpen}
        player={snapshot?.presentation?.player ?? null}
        contacts={snapshot?.presentation?.contacts ?? []}
        systemContacts={snapshot?.presentation?.systemContacts ?? []}
        session={snapshot?.session ?? null}
        viewRequest={chatViewRequest}
        client={client}
        onClose={() => {
          setContactOpen(false);
          setActiveNavigation('hand');
        }}
      />
    </main>
  );
}
