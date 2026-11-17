import React, { useEffect, useMemo, useState } from 'react';
import './ContactPanel.css';
import {
  Badge,
  Button,
  ContactAvatar,
  ContactComposer,
  ContactConversation,
  ContactDetail,
  ContactHeader,
  ContactList,
  ContactListItem,
  ContactScrollArea,
  ContactSection,
  ContactTopicList,
  ContactWorkspace,
  Drawer,
  Separator,
} from '../../design-system/index.js';

function StatList({ stats = {} }) {
  const entries = Object.entries(stats || {});
  if (!entries.length) {
    return (
      <div className="vsr-contact-profile__empty-state">
        <span className="vsr-contact-profile__empty-icon" aria-hidden="true">insights</span>
        <span>Nhân vật chưa có chỉ số.</span>
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
        const progress = hasProgress ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
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
              <div
                className="vsr-contact-stat-card__track"
                role="progressbar"
                aria-label={stat?.label || key}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={Math.min(max, Math.max(0, current))}
              >
                <span style={{ width: progress + '%' }} />
              </div>
            ) : (
              <span className="vsr-contact-stat-card__no-scale">Không có thang đo</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RelationshipList({ relationships = [], contacts, onSelect }) {
  if (!relationships.length) {
    return (
      <div className="vsr-contact-profile__empty-state">
        <span className="vsr-contact-profile__empty-icon" aria-hidden="true">group</span>
        <strong>Chưa có quan hệ</strong>
        <span>Các mối quan hệ sẽ xuất hiện tại đây khi được ghi nhận.</span>
      </div>
    );
  }

  return (
    <div className="vsr-contact-relationships">
      {relationships.map((relationship, index) => {
        const related = contacts.find(item => item.id === relationship.characterId);
        const name = relationship.characterName || related?.name || relationship.characterId || 'Không xác định';
        return (
          <div className="vsr-contact-relationship" key={relationship.characterId || index}>
            {related ? (
              <ContactAvatar name={related.name || related.id} avatar={related.avatar} />
            ) : (
              <span className="vsr-contact-relationship__avatar" aria-hidden="true">
                {(name || '?').trim().charAt(0).toUpperCase()}
              </span>
            )}
            <div className="vsr-contact-relationship__copy">
              <strong>{name}</strong>
              <span>{relationship.tag || 'Chưa phân loại'}</span>
            </div>
            {related && (
              <Button size="sm" variant="tertiary" onClick={() => onSelect(related.id)}>
                Xem hồ sơ
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContactProfile({ character, player, contacts, onSelect }) {
  if (!character) return null;
  const isPlayer = character.id === player?.id;

  return (
    <div className="vsr-contact-profile">
      <header className="vsr-contact-profile__hero">
        <ContactAvatar name={character.name || character.id} avatar={character.avatar} size="lg" />
        <div className="vsr-contact-profile__identity">
          <h3>{character.name || character.id}</h3>
          <span className="vsr-contact-profile__id">ID: {character.id}</span>
          <div className="vsr-contact-profile__badges">
            {isPlayer
              ? <Badge tone="success">Danh tính đang điều khiển</Badge>
              : <Badge tone={character.presence === 'present' ? 'success' : 'neutral'}>
                  {character.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp'}
                </Badge>}
            {isPlayer && character.identityMode && <Badge tone="info">Faker · {character.identityMode}</Badge>}
            {!isPlayer && Number.isFinite(character.metCount) && (
              <Badge tone="neutral">Đã gặp {character.metCount} lần</Badge>
            )}
          </div>
        </div>
      </header>

      <section className="vsr-contact-profile__section">
        <h4><span aria-hidden="true">person</span>Giới thiệu</h4>
        <p className="vsr-contact-profile__description">
          {character.description || 'Nhân vật chưa có mô tả.'}
        </p>
      </section>

      <section className="vsr-contact-profile__section">
        <h4><span aria-hidden="true">insights</span>Chỉ số</h4>
        <StatList stats={character.stats} />
      </section>

      <section className="vsr-contact-profile__section">
        <h4><span aria-hidden="true">groups</span>Quan hệ</h4>
        <RelationshipList relationships={character.relationship || []} contacts={contacts} onSelect={onSelect} />
      </section>
    </div>
  );
}

export default function ContactPanel({ open, onClose, player, contacts = [], session = null, client }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [activeArea, setActiveArea] = useState('threads');
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingThreadId, setPendingThreadId] = useState(null);
  const [chatPending, setChatPending] = useState(false);
  const [chatError, setChatError] = useState('');

  const allContacts = useMemo(() => [
    ...(player ? [{ ...player, kind: 'player', threads: [] }] : []),
    ...contacts.map(contact => ({ ...contact, kind: 'contact', threads: Array.isArray(contact.threads) ? contact.threads : [] }))
  ], [player, contacts]);

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
      setChatError(error?.message || 'Không thể mở hội thoại này.');
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
      setChatError(error?.message || 'Engine không thể tiếp tục hội thoại.');
    } finally {
      setChatPending(false);
    }
  }

  function contactName(id) {
    return allContacts.find(contact => contact.id === id)?.name || id || 'Không xác định';
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Messages"
      description="Danh bạ, thread và hội thoại từ Engine"
      size="full"
      side="right"
      className="vsr-contact-drawer"
    >
      <ContactWorkspace>
        <ContactList className={mobileView === 'detail' ? 'is-hidden-compact' : ''}>
          <header className="vsr-contact-list__header">
            <h1>Messages</h1>
            <Button size="sm" variant="tertiary" onClick={close} aria-label="Đóng danh bạ">
              Đóng
            </Button>
          </header>
          <ContactScrollArea className="vsr-contact-list__items" aria-label="Danh sách liên hệ">
            {allContacts.map(contact => {
              const unreadCount = contact.threads.filter(thread => thread.isUnread).length;
              const latestThread = contact.threads[0];
              return (
                <ContactListItem
                  key={contact.id}
                  selected={selectedId === contact.id}
                  onClick={() => selectContact(contact.id)}
                  aria-label={'Mở liên hệ ' + (contact.name || contact.id)}
                >
                  <ContactAvatar name={contact.name || contact.id} avatar={contact.avatar} />
                  <span className="vsr-contact-list-item__copy">
                    <span className="vsr-contact-list-item__name">{contact.name || contact.id}</span>
                    <span className="vsr-contact-list-item__preview">
                      {latestThread?.preview || (contact.kind === 'player'
                        ? 'Danh tính đang điều khiển'
                        : contact.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp')}
                    </span>
                  </span>
                  {unreadCount > 0 && <Badge tone="danger">{unreadCount}</Badge>}
                </ContactListItem>
              );
            })}
            {!allContacts.length && (
              <p className="vsr-contact-list__empty">
                Snapshot hiện chưa có dữ liệu danh tính hoặc liên hệ.
              </p>
            )}
          </ContactScrollArea>
        </ContactList>

        <ContactDetail className={!selected || mobileView === 'list' ? 'is-hidden-compact' : ''}>
          {!selected ? (
            <div className="vsr-contact-empty">
              <span className="vsr-contact-empty__icon" aria-hidden="true">chat_bubble_outline</span>
              <p>Chọn một liên hệ để xem các thread hội thoại.</p>
            </div>
          ) : (
            <>
              <ContactHeader>
                <Button
                  className={profileOpen || activeArea === 'conversation' ? 'vsr-contact-back is-visible' : 'vsr-contact-back'}
                  size="sm"
                  variant="tertiary"
                  onClick={() => {
                    if (profileOpen) {
                      setProfileOpen(false);
                    } else if (activeArea === 'conversation') {
                      setActiveArea('threads');
                      setChatError('');
                    } else {
                      setMobileView('list');
                    }
                  }}
                  aria-label={profileOpen ? 'Đóng thông tin' : activeArea === 'conversation' ? 'Quay lại danh sách thread' : 'Quay lại danh sách liên hệ'}
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
              </ContactHeader>

              {profileOpen && (
                <div className="vsr-contact-info-panel" role="region" aria-label="Thông tin liên hệ">
                  <ContactScrollArea className="vsr-contact-info-panel__scroll">
                    <ContactProfile
                      character={selected}
                      player={player}
                      contacts={allContacts}
                      onSelect={id => {
                        selectContact(id);
                        setProfileOpen(true);
                      }}
                    />
                  </ContactScrollArea>
                </div>
              )}
              <ContactScrollArea className="vsr-contact-detail-content" aria-hidden={profileOpen || undefined}>
                {activeArea === 'threads' ? (
                  <ContactTopicList aria-label={'Thread của ' + (selected.name || selected.id)}>
                    {threads.length ? threads.map(thread => (
                      <button
                        type="button"
                        className={'vsr-contact-thread' + (thread.isUnread ? ' is-unread' : '')}
                        key={thread.id}
                        onClick={() => openThread(thread)}
                        disabled={Boolean(pendingThreadId)}
                        aria-label={'Mở thread ' + thread.title}
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
                        <strong>Chưa có thread</strong>
                        <p>Thread sẽ xuất hiện khi Engine kích hoạt hội thoại liên quan đến nhân vật này.</p>
                      </div>
                    )}
                  </ContactTopicList>
                ) : (
                  <ContactConversation>
                    <div className="vsr-contact-conversation__history" aria-live="polite">
                      {history.length ? history.map((line, index) => {
                        const senderId = line.nameID || line.char_id;
                        const isPlayer = senderId === player?.id;
                        const sender = allContacts.find(contact => contact.id === senderId);
                        return isPlayer ? (
                          <div className="vsr-contact-message is-player" key={selectedThreadId + ':' + index}>
                            <p>{line.text || ''}</p>
                          </div>
                        ) : (
                          <div className="vsr-contact-message-row" key={selectedThreadId + ':' + index}>
                            <ContactAvatar
                              name={sender?.name || contactName(senderId)}
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
                          <strong>{selectedThread?.title || 'Hội thoại'}</strong>
                          <p>Engine chưa trả về nội dung cho thread này.</p>
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
                      ) : isActiveThread && chatSession.isReview === true ? (
                        <div className="vsr-contact-composer__review">
                          <p className="vsr-contact-composer__hint">Bạn đang xem lại hội thoại đã kết thúc. Nội dung ở chế độ chỉ đọc.</p>
                          <Button className="vsr-contact-chat-next" disabled={chatActionsDisabled} onClick={() => progressChat()}>
                            {chatPending ? 'Đang đóng…' : 'Đóng hội thoại'}
                          </Button>
                        </div>
                      ) : isActiveThread ? (
                        <Button className="vsr-contact-chat-next" disabled={chatActionsDisabled} onClick={() => progressChat()}>
                          <span className="vsr-contact-chat-next__label">
                            <span className="vsr-contact-chat-next__status" aria-hidden="true">●</span>
                            {chatPending || chatSession.transitionPending === true ? 'Đang chuyển đoạn…' : 'Chạm để tiếp tục…'}
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

    </Drawer>
  );
}
