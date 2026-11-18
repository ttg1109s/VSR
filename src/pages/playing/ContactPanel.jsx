import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Badge,
  Button,
  ContactAvatar,
  ContactComposer,
  ContactConversation,
  ContactDetail,
  ContactList,
  ContactListItem,
  ContactScrollArea,
  ContactTopicList,
  ContactWorkspace,
  Drawer,
  ProgressBar,
} from '../../design-system/index.js';

function StatList({ stats = {}, hideUnknown = false }) {
  const entries = Object.entries(stats || {}).filter(([, stat]) => !hideUnknown || stat?.unknown !== true);
  if (hideUnknown && entries.length === 0) return null;
  if (!entries.length) {
    return (
      <div className="vsr-contact-profile__empty-state">
        <span className="vsr-contact-profile__empty-icon" aria-hidden="true">insights</span>
        <span>Nhân vật này chưa có chỉ số.</span>
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
              <span className="vsr-contact-stat-card__no-scale">Chưa xác định thang đo</span>
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
        <span className="vsr-contact-relationship-summary__count">Số lần gặp: {metCount}</span>
      </div>
    </div>
  );
}

function ContactProfile({ character }) {
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
          <StatList stats={character.stats} hideUnknown />
        </section>
      )}
    </div>
  );
}


function IdentityFact({ label, identity, emphasis = false }) {
  if (!identity?.id) return null;
  return (
    <div className={`vsr-identity-fact${emphasis ? ' is-emphasized' : ''}`}>
      <span className="vsr-identity-fact__label">{label}</span>
      <span className="vsr-identity-fact__value">
        <ContactAvatar name={identity.name || identity.id} avatar={identity.avatar} />
        <strong>{identity.name || identity.id}</strong>
      </span>
    </div>
  );
}

function IdentityDrawer({ open, onClose, player, contacts, onSelectContact }) {
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
        ? `Danh tính của bạn không thay đổi và hiện đang ở trong cơ thể của ${context.currentBody.name}.`
        : 'Danh tính của bạn không thay đổi dù đang ở trong cơ thể khác.'
    },
    mask: {
      title: 'Cải trang',
      badge: 'MẶT NẠ',
      identityLabel: 'Nhân dạng hiện tại',
      description: context.activePersona?.name
        ? `Danh tính và cơ thể gốc của bạn không thay đổi, nhưng bạn đang xuất hiện dưới nhân dạng ${context.activePersona.name}.`
        : 'Danh tính và cơ thể gốc của bạn không thay đổi, nhưng bạn đang sử dụng một nhân dạng khác.'
    },
    swap: {
      title: 'Hoán đổi',
      badge: 'HOÁN ĐỔI',
      identityLabel: 'Danh tính hiện tại',
      description: `Danh tính đang điều khiển hiện tại là ${name}.`
    }
  }[mode] || {
    title: null,
    badge: null,
    identityLabel: 'Danh tính của bạn',
    description: null
  };

  const originalIdentity = context.originalIdentity || player;
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
            <ContactAvatar name={name} avatar={player.avatar} size="lg" />
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
          <section className="vsr-identity-mode" aria-label="Trạng thái danh tính">
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
          <section className="vsr-identity-facts" aria-label="Các lớp danh tính">
            <IdentityFact label="Danh tính gốc" identity={originalIdentity} />
            <IdentityFact label="Cơ thể hiện tại" identity={currentBody} />
            <IdentityFact label="Nhân dạng hiện tại" identity={activePersona} emphasis />
          </section>
        )}

        {mode === 'soul' && (
          <section className="vsr-identity-facts" aria-label="Các lớp danh tính">
            <IdentityFact label="Danh tính gốc" identity={originalIdentity} />
            <IdentityFact label="Cơ thể hiện tại" identity={currentBody} emphasis />
          </section>
        )}

        {mode === 'swap' && (
          <section className="vsr-identity-facts" aria-label="Các lớp danh tính">
            <IdentityFact label="Danh tính trước khi hoán đổi" identity={originalIdentity} />
            <IdentityFact label="Danh tính hiện tại" identity={activePersona} emphasis />
          </section>
        )}

        {mode !== 'soul' && mode !== 'mask' && mode !== 'swap' && player.identityContext && (
          <section className="vsr-identity-facts" aria-label="Các lớp danh tính">
            <IdentityFact label="Danh tính gốc" identity={originalIdentity} />
            <IdentityFact label="Cơ thể hiện tại" identity={currentBody} />
          </section>
        )}

        {player.description && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">description</span>Tổng quan</h3>
            <p className="vsr-contact-profile__description">{player.description}</p>
          </section>
        )}

        {hasStats && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">bar_chart</span>Chỉ số</h3>
            {context.statsOwner?.name && (
              <p className="vsr-identity-section__source">Stats for {context.statsOwner.name}</p>
            )}
            <StatList stats={stats} />
          </section>
        )}

        {hasRelationships && (
          <section className="vsr-identity-section">
            <h3><span aria-hidden="true">groups</span>Mối quan hệ</h3>
            {context.relationshipOwner?.name && (
              <p className="vsr-identity-section__source">Relationships for {context.relationshipOwner.name}</p>
            )}
            <RelationshipList
              relationships={relationships}
              contacts={contacts}
              onSelect={onSelectContact}
            />
          </section>
        )}
      </div>
    </Drawer>
  );
}

export default function ContactPanel({ open, onClose, player, contacts = [], systemContacts = [], session = null, viewRequest = null, client }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [activeArea, setActiveArea] = useState('threads');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState(null);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState('');
  const handledViewRequestIdRef = useRef(null);
  const conversationHistoryRef = useRef(null);

  const allContacts = useMemo(() => [
    ...contacts.map(contact => ({
      ...contact,
      kind: 'character',
      threads: Array.isArray(contact.threads) ? contact.threads : []
    })),
    ...systemContacts.map(contact => ({
      ...contact,
      kind: 'system',
      threads: Array.isArray(contact.threads) ? contact.threads : []
    }))
  ], [contacts, systemContacts]);
  const characterContacts = allContacts.filter(contact => contact.kind === 'character');
  const systemContactEntries = allContacts.filter(contact => contact.kind === 'system');

  const selected = allContacts.find(contact => contact.id === selectedId) || null;
  const threads = selected?.threads || [];
  const selectedThread = threads.find(thread => thread.id === selectedThreadId) || null;
  const chatSession = session?.chat || {};
  const isActiveThread = chatSession.active === true && chatSession.id === selectedThreadId;
  const history = selectedThreadId && chatSession.history?.[selectedThreadId]
    ? chatSession.history[selectedThreadId]
    : [];
  const choices = isActiveThread && chatSession.waitingChoice === true && Array.isArray(chatSession.choices) ? chatSession.choices : [];
  const chatActionsDisabled = chatPending || chatSession.transitionPending === true || !client;
  // A selected contact owns the Drawer header in both its thread list and conversation.
  // The generic "Liên hệ" header is only shown while browsing the contact list.
  const showContactThreadHeader = Boolean(selected);

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
    if (selectedId && !allContacts.some(contact => contact.id === selectedId)) {
      setSelectedId(null);
      setSelectedThreadId(null);
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('threads');
    }
  }, [allContacts, selectedId]);

  useEffect(() => {
    const activeChat = session?.chat;
    if (!open || activeChat?.active !== true || !activeChat.id || !activeChat.contactId) return;
    if (!allContacts.some(contact => contact.id === activeChat.contactId)) return;
    setSelectedId(activeChat.contactId);
    setSelectedThreadId(activeChat.id);
    setMobileView('detail');
    setActiveArea('conversation');
    setProfileOpen(false);
    setChatError('');
  }, [open, session?.chat?.active, session?.chat?.id, session?.chat?.contactId, allContacts]);

  useEffect(() => {
    if (!open || !viewRequest?.requestId || !viewRequest.contactId || !viewRequest.chatId) return;
    // viewRequested is a one-shot navigation intent. Do not replay an old
    // request when Contact is closed and opened again.
    if (handledViewRequestIdRef.current === viewRequest.requestId) return;
    const contact = allContacts.find(item => item.id === viewRequest.contactId);
    if (!contact?.threads.some(thread => thread.id === viewRequest.chatId)) return;
    handledViewRequestIdRef.current = viewRequest.requestId;
    setSelectedId(viewRequest.contactId);
    setSelectedThreadId(viewRequest.chatId);
    setMobileView('detail');
    setActiveArea('conversation');
    setProfileOpen(false);
    setChatError('');
  }, [open, viewRequest?.requestId, viewRequest?.contactId, viewRequest?.chatId, allContacts]);

  useEffect(() => {
    if (!open) {
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('threads');
      setSelectedThreadId(null);
      setChatError('');
    }
  }, [open]);

  function selectContact(id) {
    if (!allContacts.some(contact => contact.id === id)) return;
    setSelectedId(id);
    setSelectedThreadId(null);
    setMobileView('detail');
    setActiveArea('threads');
    setProfileOpen(false);
    setChatError('');
  }

  function close() {
    setProfileOpen(false);
    setIdentityOpen(false);
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
    return allContacts.find(contact => contact.id === id)?.name || id || 'Không xác định';
  }

  function renderContactHeader(inDrawer = false) {
    return (
      <div className={'vsr-contact-header' + (inDrawer ? ' vsr-contact-header--drawer' : '')}>
        <Button
          className={inDrawer || profileOpen || activeArea === 'conversation' ? 'vsr-contact-back is-visible' : 'vsr-contact-back'}
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
          aria-label={profileOpen ? 'Đóng chi tiết' : activeArea === 'conversation' ? 'Quay lại danh sách chủ đề' : 'Quay lại danh sách liên hệ'}
        >
          ←
        </Button>
        <ContactAvatar name={selected.name || selected.id} avatar={selected.avatar} />
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

  function renderContactItem(contact) {
    const unreadCount = contact.threads.filter(thread => thread.isUnread).length;
    const latestThread = contact.threads[0];
    return (
      <ContactListItem
        key={contact.id}
        selected={selectedId === contact.id}
        onClick={() => selectContact(contact.id)}
        aria-label={'Mở ' + (contact.kind === 'system' ? 'nguồn ' : 'liên hệ ') + (contact.name || contact.id)}
      >
        <span className="vsr-contact-avatar-wrap">
          <ContactAvatar name={contact.name || contact.id} avatar={contact.avatar} />
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
      </ContactListItem>
    );
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Liên hệ"
      ariaLabel={selected ? 'Cuộc trò chuyện với ' + (selected.name || selected.id) : 'Liên hệ'}
      headerContent={showContactThreadHeader ? renderContactHeader(true) : null}
      headerClassName={showContactThreadHeader ? 'vsr-overlay-header--contact-thread' : undefined}
      headerActions={player && (
        <Button
          size="sm"
          variant="tertiary"
          className="vsr-contact-identity-trigger"
          onClick={() => setIdentityOpen(true)}
          aria-label="Mở danh tính"
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
      <ContactWorkspace>
        <ContactList className={mobileView === 'detail' ? 'is-hidden-compact' : ''}>
          <ContactScrollArea className="vsr-contact-list__items" aria-label="Liên hệ và nguồn hệ thống">
            <h3 className="vsr-contact-list__section-heading">Nhân vật</h3>
            {characterContacts.length ? characterContacts.map(renderContactItem) : (
              <div className="vsr-contact-list__empty" role="status">
                <span className="vsr-contact-list__empty-icon" aria-hidden="true">contacts</span>
                <strong>Chưa có liên hệ nhân vật</strong>
                <p>Nhân vật sẽ xuất hiện tại đây khi bạn gặp họ hoặc khi một chủ đề trò chuyện được kích hoạt.</p>
              </div>
            )}
            <h3 className="vsr-contact-list__section-heading">Hệ thống</h3>
            {systemContactEntries.map(renderContactItem)}
          </ContactScrollArea>
        </ContactList>

        <ContactDetail className={!selected || mobileView === 'list' ? 'is-hidden-compact' : ''}>
          {!selected ? (
            <div className="vsr-contact-empty">
              <span className="vsr-contact-empty__icon" aria-hidden="true">{allContacts.length ? 'chat_bubble_outline' : 'contacts'}</span>
              {allContacts.length ? (
                <p>Chọn một liên hệ để xem các chủ đề trò chuyện.</p>
              ) : (
                <>
                  <strong>Danh sách liên hệ của bạn đang trống</strong>
                  <p>Các nhân vật bạn gặp hoặc đã bắt đầu trò chuyện sẽ xuất hiện tại đây.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {!showContactThreadHeader && renderContactHeader()}

              {profileOpen && (
                <div className="vsr-contact-info-panel" role="region" aria-label="Thông tin liên hệ">
                  <ContactScrollArea className="vsr-contact-info-panel__scroll">
                    <ContactProfile character={selected} />
                  </ContactScrollArea>
                </div>
              )}
              <ContactScrollArea className="vsr-contact-detail-content" aria-hidden={profileOpen || undefined}>
                {activeArea === 'threads' ? (
                  <ContactTopicList aria-label={'Các chủ đề trò chuyện với ' + (selected.name || selected.id)}>
                    {threads.length ? threads.map(thread => (
                      <button
                        type="button"
                        className={'vsr-contact-thread' + (thread.isUnread ? ' is-unread' : '')}
                        key={thread.id}
                        onClick={() => openThread(thread)}
                        disabled={Boolean(pendingThreadId)}
                        aria-label={'Mở chủ đề ' + thread.title}
                      >
                        <span className="vsr-contact-thread__icon" aria-hidden="true">
                          {thread.isUnread ? 'mark_chat_unread' : 'chat_bubble_outline'}
                        </span>
                        <span className="vsr-contact-thread__copy">
                          <span className="vsr-contact-thread__title">{thread.title}</span>
                          <span className="vsr-contact-thread__preview">{thread.preview}</span>
                        </span>
                        {thread.isUnread && <span className="vsr-contact-thread__unread" aria-label="Chưa đọc" />}
                        {pendingThreadId === thread.id && <span className="vsr-contact-thread__pending">Đang mở…</span>}
                      </button>
                    )) : (
                      <div className="vsr-contact-topic-list__empty">
                        <span className="vsr-contact-topic-list__empty-icon" aria-hidden="true">forum</span>
                        <strong>{selected.kind === 'system' ? 'Chưa có nội dung' : 'Chưa có cuộc trò chuyện'}</strong>
                        <p>{selected.kind === 'system' ? 'Tin nhắn từ nguồn này sẽ xuất hiện tại đây.' : 'Cuộc trò chuyện với nhân vật này sẽ xuất hiện tại đây.'}</p>
                      </div>
                    )}
                  </ContactTopicList>
                ) : (
                  <ContactConversation>
                    <div ref={conversationHistoryRef} className="vsr-contact-conversation__history" aria-live="polite">
                      {history.length ? history.map((line, index) => {
                        const senderId = line.nameID || line.char_id;
                        const isPlayer = senderId === player?.id;
                        const sender = allContacts.find(contact => contact.id === senderId);
                        const senderName = sender?.name || (selected.kind === 'system' ? selected.name : contactName(senderId));
                        return isPlayer ? (
                          <div className="vsr-contact-message is-player" key={selectedThreadId + ':' + index}>
                            <p>{line.text || ''}</p>
                          </div>
                        ) : (
                          <div className="vsr-contact-message-row" key={selectedThreadId + ':' + index}>
                            <ContactAvatar
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
                    <ContactComposer>
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
                            {chatPending || chatSession.transitionPending === true ? 'Đang chuyển cảnh…' : 'Chạm để tiếp tục…'}
                          </span>
                          <span className="vsr-contact-chat-next__icon" aria-hidden="true">➜</span>
                        </Button>
                      ) : null}
                    </ContactComposer>
                  </ContactConversation>
                )}
              </ContactScrollArea>
              {activeArea === 'threads' && chatError && <p className="vsr-contact-chat-error" role="alert">{chatError}</p>}
            </>
          )}
        </ContactDetail>
      </ContactWorkspace>
      <IdentityDrawer
        open={identityOpen}
        onClose={() => setIdentityOpen(false)}
        player={player}
        contacts={allContacts}
        onSelectContact={id => {
          setIdentityOpen(false);
          selectContact(id);
        }}
      />
    </Drawer>
  );
}
