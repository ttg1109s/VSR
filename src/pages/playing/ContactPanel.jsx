import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  Liên hệAvatar,
  Liên hệComposer,
  Liên hệCuộc trò chuyện,
  Liên hệDetail,
  Liên hệList,
  Liên hệListItem,
  Liên hệScrollArea,
  Liên hệTopicList,
  Liên hệWorkspace,
  Drawer,
  ProgressBar,
} from '../../design-system/index.js';

function StatList({ stats = {}, hideKhông xác định = false }) {
  const entries = Object.entries(stats || {}).filter(([, stat]) => !hideKhông xác định || stat?.unknown !== true);
  if (hideKhông xác định && entries.length === 0) return null;
  if (!entries.length) {
    return (
      <div className="vsr-contact-profile__empty-state">
        <span className="vsr-contact-profile__empty-icon" aria-hidden="true">insights</span>
        <span>This character has no stats.</span>
      </div>
    );
  }

  return (
    <div className="vsr-contact-stat-grid">
      {entries.map(([key, stat]) => {
        const current = Number(stat?.current);
        const max = Number(stat?.max);
        const hasCurrent = stat?.current !== null && stat?.current !== '' && Number.isFinite(current);
        const hasProgress = stat?.max !== undefined && stat?.max !== null && stat?.max !== ''
          && Number.isFinite(max) && max > 0 && hasCurrent;
        const value = !hasCurrent
          ? '—'
          : hasProgress
            ? String(stat.current) + ' / ' + String(stat.max)
            : String(stat.current);

        return (
          <div className="vsr-contact-stat-card" key={key}>
            <div className="vsr-contact-stat-card__top">
              <span className="vsr-contact-stat-card__label">{stat?.label || key}</span>
              <strong className="vsr-contact-stat-card__value">{value}</strong>
            </div>
            {hasProgress ? (
              <div className="vsr-contact-stat-card__track">
                <ProgressBar status="determinate" value={Math.min(max, Math.max(0, current))} max={max} label={stat?.label || key} />
              </div>
            ) : (
              <span className="vsr-contact-stat-card__no-scale">No scale defined</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RelationshipSummary({ relationshipWithPlayer, metCount = 0 }) {
  const hasRelationship = relationshipWithPlayer?.hasRelationship === true;
  const tag = hasRelationship && typeof relationshipWithPlayer.tag === 'string'
    ? relationshipWithPlayer.tag.trim()
    : '';

  return (
    <div className="vsr-contact-relationship-summary">
      <span className="vsr-contact-relationship-summary__icon" aria-hidden="true">handshake</span>
      <div className="vsr-contact-relationship-summary__copy">
        <strong className="vsr-contact-relationship-summary__type">
          {tag || (hasRelationship ? 'Đã ghi nhận, chưa phân loại' : 'Không có mối quan hệ')}
        </strong>
        <span className="vsr-contact-relationship-summary__count">Times met: {metCount} times</span>
      </div>
    </div>
  );
}

function Liên hệProfile({ character }) {
  if (!character) return null;
  if (character.kind === 'system') {
    return (
      <div className="vsr-contact-profile">
        <section className="vsr-contact-profile__section">
          <p className="vsr-contact-profile__description">{character.description || 'Nguồn thông tin hệ thống.'}</p>
        </section>
      </div>
    );
  }
  const visibleStats = Object.entries(character.stats || {}).filter(([, stat]) => stat?.unknown !== true);
  return (
    <div className="vsr-contact-profile">
      <section className="vsr-contact-profile__section">
        <p className="vsr-contact-profile__description">
          {character.description || 'Chưa có mô tả nhân vật.'}
        </p>
      </section>

      <section className="vsr-contact-profile__section">
        <RelationshipSummary
          relationshipWithPlayer={character.relationshipWithPlayer}
          metCount={character.metCount}
        />
      </section>

      {visibleStats.length > 0 && (
        <section className="vsr-contact-profile__section">
          <StatList stats={character.stats} hideKhông xác định />
        </section>
      )}
    </div>
  );
}


function Danh tínhFact({ label, identity, emphasis = false }) {
  if (!identity?.id) return null;
  return (
    <div className={`vsr-identity-fact${emphasis ? ' is-emphasized' : ''}`}>
      <span className="vsr-identity-fact__label">{label}</span>
      <span className="vsr-identity-fact__value">
        <Liên hệAvatar name={identity.name || identity.id} avatar={identity.avatar} />
        <strong>{identity.name || identity.id}</strong>
      </span>
    </div>
  );
}

function Danh tínhDrawer({ open, onClose, player, contacts, onSelectLiên hệ }) {
  if (!player) return null;
  const mode = player.identityMode;
  const context = player.identityContext || {};
  const target = player.identityTarget;
  const name = player.name || player.id;
  const modeContent = {
    soul: {
      title: 'Chiếm hữu',
      badge: 'LINH HỒN',
      identityLabel: 'Danh tính gốc',
      description: context.currentBody?.name
        ? `Danh tính của bạn remains unchanged and currently inhabits the body of ${context.currentBody.name}.`
        : 'Danh tính của bạn không thay đổi dù đang ở trong cơ thể khác.'
    },
    mask: {
      title: 'Cải trang',
      badge: 'MẶT NẠ',
      identityLabel: 'Nhân dạng hiện tại',
      description: context.activePersona?.name
        ? `Danh tính của bạn and original body remain unchanged, but you are appearing as ${context.activePersona.name}.`
        : 'Danh tính và cơ thể gốc của bạn không thay đổi, nhưng bạn đang sử dụng một nhân dạng khác.'
    },
    swap: {
      title: 'Hoán đổi',
      badge: 'HOÁN ĐỔI',
      identityLabel: 'Danh tính hiện tại',
      description: `The currently controlling identity is ${name}.`
    }
  }[mode] || {
    title: null,
    badge: null,
    identityLabel: 'Danh tính của bạn',
    description: null
  };

  const originalDanh tính = context.originalDanh tính || player;
  const currentBody = context.currentBody || (mode === 'soul' ? target : player);
  const activePersona = context.activePersona || (mode === 'mask' ? target : player);
  const relationships = Array.isArray(player.relationship) ? player.relationship : [];
  const stats = player.stats && typeof player.stats === 'object' ? player.stats : {};
  const hasStats = Object.keys(stats).length > 0;
  const hasRelationships = relationships.length > 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Danh tính"
      size="lg"
      side="right"
      className="vsr-identity-drawer"
    >
      <div className="vsr-identity-content">
        <section className="vsr-identity-hero" aria-label="Danh tính đang sử dụng">
          <span className="vsr-identity-hero__avatar-wrap">
            <Liên hệAvatar name={name} avatar={player.avatar} size="lg" />
            {modeContent.badge && (
              <span className="vsr-contact-me__mode-badge" aria-label={modeContent.badge}>
                {modeContent.badge}
              </span>
            )}
          </span>
          <div className="vsr-identity-hero__copy">
            <h3>{name}</h3>
            <span className="vsr-identity-hero__identity-label">{modeContent.identityLabel}</span>
          </div>
        </section>

        {modeContent.description && (
          <section className="vsr-identity-mode" aria-label="Danh tính status">
            <span className="vsr-identity-mode__icon" aria-hidden="true">
              {mode === 'soul' ? 'psychology_alt' : mode === 'mask' ? 'masks' : 'swap_horiz'}
            </span>
            <div className="vsr-identity-mode__copy">
              <h3>{modeContent.title}</h3>
              <p>{modeContent.description}</p>
            </div>
          </section>
        )}

        {mode === 'mask' && (
          <section className="vsr-identity-facts" aria-label="Danh tính layers">
            <Danh tínhFact label="Danh tính gốc" identity={originalDanh tính} />
            <Danh tínhFact label="Cơ thể hiện tại" identity={currentBody} />
            <Danh tínhFact label="Nhân dạng hiện tại" identity={activePersona} emphasis />
          </section>
        )}

        {mode === 'soul' && (
          <section className="vsr-identity-facts" aria-label="Danh tính layers">
            <Danh tínhFact label="Danh tính gốc" identity={originalDanh tính} />
            <Danh tínhFact label="Cơ thể hiện tại" identity={currentBody} emphasis />
          </section>
        )}

        {mode === 'swap' && (
          <section className="vsr-identity-facts" aria-label="Danh tính layers">
            <Danh tínhFact label="Danh tính before swap" identity={originalDanh tính} />
            <Danh tínhFact label="Danh tính hiện tại" identity={activePersona} emphasis />
          </section>
        )}

        {mode !== 'soul' && mode !== 'mask' && mode !== 'swap' && player.identityContext && (
          <section className="vsr-identity-facts" aria-label="Danh tính layers">
            <Danh tínhFact label="Danh tính gốc" identity={originalDanh tính} />
            <Danh tínhFact label="Cơ thể hiện tại" identity={currentBody} />
          </section>
        )}

        {player.description && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">description</span>Overview</h3>
            <p className="vsr-contact-profile__description">{player.description}</p>
          </section>
        )}

        {hasStats && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">bar_chart</span>Stats</h3>
            {context.statsOwner?.name && (
              <p className="vsr-identity-section__source">Stats for {context.statsOwner.name}</p>
            )}
            <StatList stats={stats} />
          </section>
        )}

        {hasRelationships && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">groups</span>Relationships</h3>
            {context.relationshipOwner?.name && (
              <p className="vsr-identity-section__source">Relationships for {context.relationshipOwner.name}</p>
            )}
            <RelationshipList
              relationships={relationships}
              contacts={contacts}
              onSelect={onSelectLiên hệ}
            />
          </section>
        )}
      </div>
    </Drawer>
  );
}

export default function Liên hệPanel({ open, onClose, player, contacts = [], systemLiên hệs = [], session = null, viewRequest = null, client }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [activeArea, setActiveArea] = useState('threads');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [identityOpen, setDanh tínhOpen] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState(null);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState('');
  const handledViewRequestIdRef = useRef(null);
  const conversationHistoryRef = useRef(null);

  const allLiên hệs = useMemo(() => [
    ...contacts.map(liên hệ => ({
      ...contact,
      kind: 'character',
      threads: Array.isArray(contact.threads) ? contact.threads : []
    })),
    ...systemLiên hệs.map(liên hệ => ({
      ...contact,
      kind: 'system',
      threads: Array.isArray(contact.threads) ? contact.threads : []
    }))
  ], [contacts, systemLiên hệs]);
  const characterLiên hệs = allLiên hệs.filter(liên hệ => contact.kind === 'character');
  const systemLiên hệEntries = allLiên hệs.filter(liên hệ => contact.kind === 'system');

  const selected = allLiên hệs.find(liên hệ => contact.id === selectedId) || null;
  const threads = selected?.threads || [];
  const selectedThread = threads.find(thread => thread.id === selectedThreadId) || null;
  const chatSession = session?.chat || {};
  const isActiveThread = chatSession.active === true && chatSession.id === selectedThreadId;
  const history = selectedThreadId && chatSession.history?.[selectedThreadId]
    ? chatSession.history[selectedThreadId]
    : [];
  const choices = isActiveThread && chatSession.waitingChoice === true && Array.isArray(chatSession.choices) ? chatSession.choices : [];
  const chatActionsDisabled = chatPending || chatSession.transitionPending === true || !client;
  // A selected liên hệ owns the Drawer header in both its thread list and conversation.
  // The generic "Liên hệ" header is only shown while browsing the liên hệ list.
  const showLiên hệThreadHeader = Boolean(selected);

  // Jump to the end when entering or switching threads; smoothly follow
  // newly appended lines while the same conversation remains open.
  const conversationScrollStateRef = useRef({ threadId: null, historyLength: 0 });
  useLayoutEffect(() => {
    if (activeArea !== 'conversation' || !selectedThreadId) return;
    const historyElement = conversationHistoryRef.current;
    if (!historyElement) return;

    const previous = conversationScrollStateRef.current;
    const sameThread = previous.threadId === selectedThreadId;
    const appendedLines = sameThread && history.length > previous.historyLength;
    const bottom = historyElement.scrollHeight;

    if (appendedLines) {
      historyElement.scrollTo({ top: bottom, behavior: 'smooth' });
    } else {
      historyElement.scrollTop = bottom;
    }

    conversationScrollStateRef.current = {
      threadId: selectedThreadId,
      historyLength: history.length
    };
  }, [activeArea, selectedThreadId, history.length]);

  useEffect(() => {
    if (selectedId && !allLiên hệs.some(liên hệ => contact.id === selectedId)) {
      setSelectedId(null);
      setSelectedThreadId(null);
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('threads');
    }
  }, [allLiên hệs, selectedId]);

  useEffect(() => {
    const activeChat = session?.chat;
    if (!open || activeChat?.active !== true || !activeChat.id || !activeChat.contactId) return;
    if (!allLiên hệs.some(liên hệ => contact.id === activeChat.contactId)) return;
    setSelectedId(activeChat.contactId);
    setSelectedThreadId(activeChat.id);
    setMobileView('detail');
    setActiveArea('conversation');
    setProfileOpen(false);
    setChatError('');
  }, [open, session?.chat?.active, session?.chat?.id, session?.chat?.contactId, allLiên hệs]);

  useEffect(() => {
    if (!open || !viewRequest?.requestId || !viewRequest.contactId || !viewRequest.chatId) return;
    // viewRequested is a one-shot navigation intent. Do not replay an old
    // request when Liên hệ is closed and opened again.
    if (handledViewRequestIdRef.current === viewRequest.requestId) return;
    const liên hệ = allLiên hệs.find(item => item.id === viewRequest.contactId);
    if (!contact?.threads.some(thread => thread.id === viewRequest.chatId)) return;
    handledViewRequestIdRef.current = viewRequest.requestId;
    setSelectedId(viewRequest.contactId);
    setSelectedThreadId(viewRequest.chatId);
    setMobileView('detail');
    setActiveArea('conversation');
    setProfileOpen(false);
    setChatError('');
  }, [open, viewRequest?.requestId, viewRequest?.contactId, viewRequest?.chatId, allLiên hệs]);

  useEffect(() => {
    if (!open) {
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('threads');
      setSelectedThreadId(null);
      setChatError('');
    }
  }, [open]);

  function selectLiên hệ(id) {
    if (!allLiên hệs.some(liên hệ => contact.id === id)) return;
    setSelectedId(id);
    setSelectedThreadId(null);
    setMobileView('detail');
    setActiveArea('threads');
    setProfileOpen(false);
    setChatError('');
  }

  function close() {
    setProfileOpen(false);
    setDanh tínhOpen(false);
    onClose?.();
  }

  async function openThread(thread) {
    if (!selected || !client?.openChatThread || pendingThreadId) return;
    setPendingThreadId(thread.id);
    setChatError('');
    try {
      await client.openChatThread(selected.id, thread.id);
      setSelectedThreadId(thread.id);
      setActiveArea('conversation');
    } catch (error) {
      setChatError(error?.message || 'Không thể mở cuộc trò chuyện này.');
    } finally {
      setPendingThreadId(null);
    }
  }

  async function progressChat(choiceIndex = null) {
    if (!client || chatPending || chatSession.transitionPending === true || !isActiveThread) return;
    setChatPending(true);
    setChatError('');
    try {
      if (choiceIndex === null) await client.nextChat();
      else await client.selectChatChoice(choiceIndex);
    } catch (error) {
      setChatError(error?.message || 'Engine không thể tiếp tục cuộc trò chuyện.');
    } finally {
      setChatPending(false);
    }
  }

  function contactName(id) {
    return allLiên hệs.find(liên hệ => contact.id === id)?.name || id || 'Không xác định';
  }

  function renderLiên hệHeader(inDrawer = false) {
    return (
      <div className={'vsr-contact-header' + (inDrawer ? ' vsr-contact-header--drawer' : '')}>
        <Button
          className={inDrawer || profileMở || activeArea === 'conversation' ? 'vsr-contact-back is-visible' : 'vsr-contact-back'}
          size="sm"
          variant="tertiary"
          onClick={() => {
            if (profileOpen) {
              setProfileOpen(false);
            } else if (activeArea === 'conversation') {
              setActiveArea('threads');
              setChatError('');
            } else if (inDrawer) {
              setSelectedId(null);
              setSelectedThreadId(null);
              setActiveArea('threads');
              setMobileView('list');
            } else {
              setMobileView('list');
            }
          }}
          aria-label={profileMở ? 'Đóng chi tiết' : activeArea === 'conversation' ? 'Quay lại danh sách chủ đề' : 'Quay lại danh sách liên hệ'}
        >
          ←
        </Button>
        <Liên hệAvatar name={selected.name || selected.id} avatar={selected.avatar} />
        <button
          type="button"
          className="vsr-contact-header__identity"
          onClick={() => setProfileOpen(true)}
        >
          <strong>{selected.name || selected.id}</strong>
        </button>
        <Button size="sm" variant="tertiary" className="vsr-contact-info-trigger" onClick={() => setProfileOpen(true)} aria-label="Thông tin">
          <span className="vsr-contact-info-trigger__icon" aria-hidden="true">info</span>
        </Button>
      </div>
    );
  }

  function renderLiên hệItem(contact) {
    const unreadCount = contact.threads.filter(thread => thread.isChưa đọc).length;
    const latestThread = contact.threads[0];
    return (
      <Liên hệListItem
        key={contact.id}
        selected={selectedId === contact.id}
        onClick={() => selectLiên hệ(contact.id)}
        aria-label={'Mở ' + (contact.kind === 'system' ? 'nguồn ' : 'liên hệ ') + (contact.name || contact.id)}
      >
        <span className="vsr-contact-avatar-wrap">
          <Liên hệAvatar name={contact.name || contact.id} avatar={contact.avatar} />
          {contact.presence === 'present' && (
            <span className="vsr-contact-avatar__presence" role="img" aria-label="Đang có mặt trong cảnh hiện tại" title="Đang có mặt trong cảnh hiện tại" />
          )}
        </span>
        <span className="vsr-contact-list-item__copy">
          <span className="vsr-contact-list-item__name">{contact.name || contact.id}</span>
          <span className="vsr-contact-list-item__preview">
            {latestThread ? (latestThread.preview || 'Có cuộc trò chuyện') : 'Chưa có tin nhắn hoặc cuộc trò chuyện nào.'}
          </span>
        </span>
        {unreadCount > 0 && <Badge tone="danger">{unreadCount}</Badge>}
      </Liên hệListItem>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Liên hệ"
      ariaLabel={selected ? 'Cuộc trò chuyện với ' + (selected.name || selected.id) : 'Liên hệ'}
      headerContent={showLiên hệThreadHeader ? renderLiên hệHeader(true) : null}
      headerClassName={showLiên hệThreadHeader ? 'vsr-overlay-header--contact-thread' : undefined}
      headerActions={player && (
        <Button
          size="sm"
          variant="tertiary"
          className="vsr-contact-identity-trigger"
          onClick={() => setDanh tínhOpen(true)}
          aria-label="Mở identity"
          title="Danh tính"
        >
          <svg className="vsr-contact-header-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
            <circle cx="9" cy="10" r="2" />
            <path d="M6.5 16c.6-1.5 1.5-2.2 2.5-2.2s1.9.7 2.5 2.2M14.5 9h3M14.5 13h3" />
          </svg>
        </Button>
      )}
      size="full"
      side="right"
      className="vsr-contact-drawer"
    >
      <Liên hệWorkspace>
        <Liên hệList className={mobileView === 'detail' ? 'is-hidden-compact' : ''}>
          <Liên hệScrollArea className="vsr-contact-list__items" aria-label="Liên hệs and system sources">
            <h3 className="vsr-contact-list__section-heading">Nhân vật</h3>
            {characterLiên hệs.length ? characterLiên hệs.map(renderLiên hệItem) : (
              <div className="vsr-contact-list__empty" role="status">
                <span className="vsr-contact-list__empty-icon" aria-hidden="true">contacts</span>
                <strong>Chưa có liên hệ nhân vật</strong>
                <p>Nhân vật will appear here once encountered or a thread is activated.</p>
              </div>
            )}
            <h3 className="vsr-contact-list__section-heading">Hệ thống</h3>
            {systemLiên hệEntries.map(renderLiên hệItem)}
          </Liên hệScrollArea>
        </Liên hệList>

        <Liên hệDetail className={!selected || mobileView === 'list' ? 'is-hidden-compact' : ''}>
          {!selected ? (
            <div className="vsr-contact-empty">
              <span className="vsr-contact-empty__icon" aria-hidden="true">{allLiên hệs.length ? 'chat_bubble_outline' : 'contacts'}</span>
              {allLiên hệs.length ? (
                <p>Select a liên hệ to view its conversation threads.</p>
              ) : (
                <>
                  <strong>Your liên hệ list is empty</strong>
                  <p>Nhân vật you encounter or have an activated conversation with will appear here.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {!showLiên hệThreadHeader && renderLiên hệHeader()}

              {profileMở && (
                <div className="vsr-contact-info-panel" role="region" aria-label="Liên hệ details">
                  <Liên hệScrollArea className="vsr-contact-info-panel__scroll">
                    <Liên hệProfile character={selected} />
                  </Liên hệScrollArea>
                </div>
              )}
              <Liên hệScrollArea className="vsr-contact-detail-content" aria-hidden={profileMở || undefined}>
                {activeArea === 'threads' ? (
                  <Liên hệTopicList aria-label={'Các chủ đề trò chuyện với ' + (selected.name || selected.id)}>
                    {threads.length ? threads.map(thread => (
                      <button
                        type="button"
                        className={'vsr-contact-thread' + (thread.isChưa đọc ? ' is-unread' : '')}
                        key={thread.id}
                        onClick={() => openThread(thread)}
                        disabled={Boolean(pendingThreadId)}
                        aria-label={'Mở thread ' + thread.title}
                      >
                        <span className="vsr-contact-thread__icon" aria-hidden="true">
                          {thread.isChưa đọc ? 'mark_chat_unread' : 'chat_bubble_outline'}
                        </span>
                        <span className="vsr-contact-thread__copy">
                          <span className="vsr-contact-thread__title">{thread.title}</span>
                          <span className="vsr-contact-thread__preview">{thread.preview}</span>
                        </span>
                        {thread.isChưa đọc && <span className="vsr-contact-thread__unread" aria-label="Chưa đọc" />}
                        {pendingThreadId === thread.id && <span className="vsr-contact-thread__pending">Opening…</span>}
                      </button>
                    )) : (
                      <div className="vsr-contact-topic-list__empty">
                        <span className="vsr-contact-topic-list__empty-icon" aria-hidden="true">forum</span>
                        <strong>{selected.kind === 'system' ? 'Chưa có nội dung' : 'Chưa có cuộc trò chuyện'}</strong>
                        <p>{selected.kind === 'system' ? 'Messages from this nguồn will appear here.' : 'Cuộc trò chuyện với nhân vật này sẽ xuất hiện tại đây.'}</p>
                      </div>
                    )}
                  </Liên hệTopicList>
                ) : (
                  <Liên hệCuộc trò chuyện>
                    <div ref={conversationHistoryRef} className="vsr-contact-conversation__history" aria-live="polite">
                      {history.length ? history.map((line, index) => {
                        const senderId = line.nameID || line.char_id;
                        const isPlayer = senderId === player?.id;
                        const sender = allLiên hệs.find(liên hệ => contact.id === senderId);
                        const senderName = sender?.name || (selected.kind === 'system' ? selected.name : contactName(senderId));
                        return isPlayer ? (
                          <div className="vsr-contact-message is-player" key={selectedThreadId + ':' + index}>
                            <p>{line.text || ''}</p>
                          </div>
                        ) : (
                          <div className="vsr-contact-message-row" key={selectedThreadId + ':' + index}>
                            <Liên hệAvatar
                              name={senderName}
                              avatar={sender?.avatar}
                              size="sm"
                              className="vsr-contact-message-row__avatar"
                            />
                            <div className="vsr-contact-message">
                              <p>{line.text || ''}</p>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="vsr-contact-conversation__empty">
                          <strong>{selectedThread?.title || 'Cuộc trò chuyện'}</strong>
                          <p>Engine không trả về nội dung cho chủ đề này.</p>
                        </div>
                      )}
                    </div>
                    <Liên hệComposer>
                      {chatError && <p className="vsr-contact-chat-error" role="alert">{chatError}</p>}
                      {isActiveThread && choices.length > 0 ? (
                        <div className="vsr-contact-chat-choice-panel">
                          {chatSession.prompt && (
                            <p className="vsr-contact-chat-choice-prompt">{chatSession.prompt}</p>
                          )}
                          <div className="vsr-contact-chat-choices">
                            {choices.map(choice => (
                              <Button
                                key={choice.index}
                                className={'vsr-contact-chat-choice' + (choice.locked ? ' is-locked' : '')}
                                variant="secondary"
                                disabled={chatActionsDisabled || choice.locked === true}
                                onClick={() => progressChat(choice.index)}
                              >
                                <span>{choice.text}</span>
                                <span className="vsr-contact-chat-choice__icon" aria-hidden="true">
                                  {choice.locked ? 'lock' : '→'}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      ) : isActiveThread ? (
                        <Button className="vsr-contact-chat-next" disabled={chatActionsDisabled} onClick={() => progressChat()}>
                          <span className="vsr-contact-chat-next__label">
                            <span className="vsr-contact-chat-next__status" aria-hidden="true">●</span>
                            {chatPending || chatSession.transitionPending === true ? 'Đang chuyển tiếp…' : 'Chạm để tiếp tục…'}
                          </span>
                          <span className="vsr-contact-chat-next__icon" aria-hidden="true">➜</span>
                        </Button>
                      ) : null}
                    </Liên hệComposer>
                  </Liên hệCuộc trò chuyện>
                )}
              </Liên hệScrollArea>
              {activeArea === 'threads' && chatError && <p className="vsr-contact-chat-error" role="alert">{chatError}</p>}
            </>
          )}
        </Liên hệDetail>
      </Liên hệWorkspace>
      <Danh tínhDrawer
        open={identityOpen}
        onClose={() => setDanh tínhOpen(false)}
        player={player}
        contacts={allLiên hệs}
        onSelectLiên hệ={id => {
          setDanh tínhOpen(false);
          selectLiên hệ(id);
        }}
      />
    </Drawer>
  );
}
