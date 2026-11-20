import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, BottomNavigation, Breadcrumb, Button, MediaFrame, useToast } from '../../design-system/index.js';
import ActionCollection from '../../features/actions/ActionCollection.jsx';
import ActionNavigator from '../../features/actions/ActionNavigator.jsx';
import ContactPanel from './ContactPanel.jsx';
import NotificationCenter from '../../features/notifications/NotificationCenter.jsx';
import InventoryWorkspace from '../../features/inventory/InventoryWorkspace.jsx';
import NoteWorkspace from '../../features/note/NoteWorkspace.jsx';
import '../../features/playing/playing-page.css';

export default function PlayingPage({ snapshot, chatViewRequest = null, client, error = '', onNavigate, soundEnabled = true, onSoundChange, modalNotification = null, onModalClose }) {
  const toast = useToast();
  // Keep a single source of truth for bottom-navigation workspace selection.
  const [activeNavigation, setActiveNavigation] = useState(null);
  const noteOpen = activeNavigation === 'note';
  const contactOpen = activeNavigation === 'contact';
  const inventoryOpen = activeNavigation === 'inventory';
  const notificationOpen = activeNavigation === 'notify';
  const [backParentPending, setBackParentPending] = useState(false);
  const actionCollectionRef = useRef(null);
  const [actionNavigation, setActionNavigation] = useState({ activeIndex: 0, actionCount: 0, activeTitle: '' });
  const handleActionNavigationStateChange = useCallback(next => setActionNavigation(next), []);
  const notifications = snapshot?.session?.notifications?.history ?? [];
  const unreadCount = snapshot?.session?.notifications?.unreadCount ?? notifications.filter(item => !item.read).length;
  const scene = snapshot?.presentation?.scene ?? null;
  const router = snapshot?.presentation?.router ?? null;
  const activeSceneId = snapshot?.game?.sceneId ?? null;
  const activeRouterId = router?.id ?? null;
  const previousContextRef = useRef({ sceneId: activeSceneId, routerId: activeRouterId });

  useEffect(() => {
    const previous = previousContextRef.current;
    const contextChanged = previous.sceneId !== activeSceneId || previous.routerId !== activeRouterId;
    previousContextRef.current = { sceneId: activeSceneId, routerId: activeRouterId };

    if (contextChanged && typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [activeSceneId, activeRouterId]);

  const activeChat = snapshot?.session?.chat ?? null;
  useEffect(() => {
    if (activeChat?.active !== true || !activeChat.id || !activeChat.contactId) return;
    setActiveNavigation('contact');
  }, [activeChat?.active, activeChat?.id, activeChat?.contactId]);

  useEffect(() => {
    if (!chatViewRequest?.requestId || !chatViewRequest.chatId || !chatViewRequest.contactId) return;
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

  const handleBackParent = useCallback(async () => {
    if (backParentPending || !scene?.hasParentScene || typeof client?.backParent !== 'function') return;
    setBackParentPending(true);
    try {
      const acknowledgement = await client.backParent();
      if (acknowledgement.result?.success === false) {
        if (acknowledgement.result.reason === 'no_parent') return;
        throw new Error('Unable to return to the parent scene.');
      }
    } catch (commandError) {
      toast(commandError.message || 'Unable to return to the parent scene.', { tone: 'warning' });
    } finally {
      setBackParentPending(false);
    }
  }, [backParentPending, scene?.hasParentScene, client, toast]);

  const sceneTitle = scene?.meta?.title || scenePath.find(item => item.id === activeSceneId)?.title || '';
  const routerDescription = typeof router?.meta?.desc === 'string' ? router.meta.desc : '';
  const routerCover = router?.meta?.cover;
  const sceneCover = scene?.meta?.cover;
  const cover = routerCover?.url ? routerCover : sceneCover;
  const status = typeof router?.meta?.subTitleStatus === 'string' && router.meta.subTitleStatus.trim()
    ? router.meta.subTitleStatus.trim()
    : '';

  const handleNavigationChange = value => {
    // Tapping the selected workspace closes it; tapping another switches directly.
    setActiveNavigation(current => current === value ? null : value);
  };
  const closeWorkspace = () => setActiveNavigation(null);

  return (
    <main className="vsr-page-shell vsr-page-shell--start vsr-page-shell--flush-top">
      <Breadcrumb
        items={breadcrumbItems}
        activeKey={activeSceneId}
        separator="›"
        scrollable
        sticky
        aria-label="Scene breadcrumb"
        className="vsr-playing-breadcrumb"
      />
      <article className="vsr-page-shell__content vsr-page-shell__content--reading">
        <section className="vsr-stack vsr-stack--gap-3" aria-label="Scene context">
          <MediaFrame
            src={cover?.url}
            type={cover?.type || 'photo'}
            ratio={cover?.ratio || '16:9'}
            alt={sceneTitle ? `${sceneTitle} scene` : 'Scene media'}
          />
          {scene?.meta?.desc && <div className="vsr-text-body">{scene.meta.desc}</div>}
          {scene?.hasParentScene && <div><Button variant="secondary" size="md" leadingIcon="arrow_back" onClick={handleBackParent} loading={backParentPending}>Back to parent</Button></div>}
        </section>
        {(routerDescription || status) && <div className="vsr-playing-divider" aria-hidden="true" />}
        {(routerDescription || status) && (
          <section className="vsr-playing-situation" aria-label="Router description">
            {(routerDescription || status) && (
              <p className="vsr-text-body vsr-playing-situation__description">
                {status && <><Badge tone="neutral">{status}</Badge>{routerDescription ? ' ' : null}</>}
                {routerDescription}
              </p>
            )}
          </section>
        )}
        <ActionCollection
          ref={actionCollectionRef}
          actions={snapshot?.presentation?.actions || []}
          client={client}
          sceneId={activeSceneId}
          passwordChallenge={snapshot?.session?.passwordChallenge || null}
          onNavigationStateChange={handleActionNavigationStateChange}
          onError={message => toast(message, { tone: 'warning' })}
        />
        {actionNavigation.actionCount > 0 && (
          <ActionNavigator
            activeIndex={actionNavigation.activeIndex}
            actionCount={actionNavigation.actionCount}
            activeTitle={actionNavigation.activeTitle}
            onNavigate={index => actionCollectionRef.current?.scrollToIndex(index)}
          />
        )}
        {error && <p className="vsr-text-error" role="alert">{error}</p>}
      </article>
      <BottomNavigation
        value={activeNavigation}
        onChange={handleNavigationChange}
        items={[
          { value: 'note', label: 'Note', icon: 'sticky_note_2' },
          ...(snapshot?.presentation?.inventory?.enabled !== false ? [{ value: 'inventory', label: 'Inventory', icon: 'inventory_2' }] : []),
          { value: 'contact', label: 'Contact', icon: 'contacts' },
          { value: 'notify', label: 'Notify', icon: 'notifications', badge: unreadCount, badgeLabel: 'unread notifications' }
        ]}
      />
      <NoteWorkspace
        snapshot={snapshot}
        open={noteOpen}
        onClose={closeWorkspace}
      />
      <InventoryWorkspace
        snapshot={snapshot}
        client={client}
        open={inventoryOpen}
        onError={message => toast(message, { tone: 'warning' })}
        onClose={closeWorkspace}
      />
      <ContactPanel
        open={contactOpen}
        player={snapshot?.presentation?.player ?? null}
        contacts={snapshot?.presentation?.contacts ?? []}
        systemContacts={snapshot?.presentation?.systemContacts ?? []}
        session={snapshot?.session ?? null}
        viewRequest={chatViewRequest}
        client={client}
        onClose={closeWorkspace}
      />
      <NotificationCenter
        open={notificationOpen}
        notifications={notifications}
        client={client}
        onClose={closeWorkspace}
        soundEnabled={soundEnabled}
        onSoundChange={onSoundChange}
        modalNotification={modalNotification}
        onModalClose={onModalClose}
      />
    </main>
  );
}
