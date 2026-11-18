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
          {tag || (hasRelationship ? 'Recorded, unclassified' : 'No relationship')}
        </strong>
        <span className="vsr-contact-relationship-summary__count">Times met: {metCount} times</span>
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
          <p className="vsr-contact-profile__description">{character.description || 'System information source.'}</p>
        </section>
      </div>
    );
  }
  const visibleStats = Object.entries(character.stats || {}).filter(([, stat]) => stat?.unknown !== true);
  return (
    <div className="vsr-contact-profile">
      <section className="vsr-contact-profile__section">
        <p className="vsr-contact-profile__description">
          {character.description || 'No character description available.'}
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
      title: 'Possession',
      badge: 'SOUL',
      identityLabel: 'Original identity',
      description: context.currentBody?.name
        ? `Your identity remains unchanged and currently inhabits the body of ${context.currentBody.name}.`
        : 'Your identity remains unchanged in another body.'
    },
    mask: {
      title: 'Disguise',
      badge: 'MASK',
      identityLabel: 'Active persona',
      description: context.activePersona?.name
        ? `Your identity and original body remain unchanged, but you are appearing as ${context.activePersona.name}.`
        : 'Your identity and original body remain unchanged, but you are using another persona.'
    },
    swap: {
      title: 'Swap',
      badge: 'SWAP',
      identityLabel: 'Current identity',
      description: `The currently controlling identity is ${name}.`
    }
  }[mode] || {
    title: null,
    badge: null,
    identityLabel: 'Your identity',
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
      title="Identity"
      size="lg"
      side="right"
      className="vsr-identity-drawer"
    >
      <div className="vsr-identity-content">
        <section className="vsr-identity-hero" aria-label="Active identity">
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
          <section className="vsr-identity-mode" aria-label="Identity status">
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
          <section className="vsr-identity-facts" aria-label="Identity layers">
            <IdentityFact label="Original identity" identity={originalIdentity} />
            <IdentityFact label="Current body" identity={currentBody} />
            <IdentityFact label="Active persona" identity={activePersona} emphasis />
          </section>
        )}

        {mode === 'soul' && (
          <section className="vsr-identity-facts" aria-label="Identity layers">
            <IdentityFact label="Original identity" identity={originalIdentity} />
            <IdentityFact label="Current body" identity={currentBody} emphasis />
          </section>
        )}

        {mode === 'swap' && (
          <section className="vsr-identity-facts" aria-label="Identity layers">
            <IdentityFact label="Identity before swap" identity={originalIdentity} />
            <IdentityFact label="Current identity" identity={activePersona} emphasis />
          </section>
        )}

        {mode !== 'soul' && mode !== 'mask' && mode !== 'swap' && player.identityContext && (
          <section className="vsr-identity-facts" aria-label="Identity layers">
            <IdentityFact label="Original identity" identity={originalIdentity} />
            <IdentityFact label="Current body" identity={currentBody} />
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
  // The generic "Contact" header is only shown while browsing the contact list.
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
      setSelectedId(null);
      setSelectedThreadId(null);
      setMobileView('list');
      setProfileOpen(false);
      setIdentityOpen(false);
      setActiveArea('threads');
      setPendingThreadId(null);
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
      setChatError(error?.message || 'Unable to open this conversation.');
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
      setChatError(error?.message || 'The engine could not continue the conversation.');
    } finally {
      setChatPending(false);
    }
  }

  function contactName(id) {
    return allContacts.find(contact => contact.id === id)?.name || id || 'Unknown';
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
          aria-label={profileOpen ? 'Close details' : activeArea === 'conversation' ? 'Back to thread list' : 'Back to contacts'}
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
        <Button size="sm" variant="tertiary" className="vsr-contact-info-trigger" onClick={() => setProfileOpen(true)} aria-label="Information">
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
        aria-label={'Open ' + (contact.kind === 'system' ? 'source ' : 'contact ') + (contact.name || contact.id)}
      >
        <span className="vsr-contact-avatar-wrap">
          <ContactAvatar name={contact.name || contact.id} avatar={contact.avatar} />
          {contact.presence === 'present' && (
            <span className="vsr-contact-avatar__presence" role="img" aria-label="Present in the current scene" title="Present in the current scene" />
          )}
        </span>
        <span className="vsr-contact-list-item__copy">
          <span className="vsr-contact-list-item__name">{contact.name || contact.id}</span>
          <span className="vsr-contact-list-item__preview">
            {latestThread ? (latestThread.preview || 'Conversation available') : 'No messages or conversations yet.'}
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
      title="Contact"
      ariaLabel={selected ? 'Conversation with ' + (selected.name || selected.id) : 'Contact'}
      headerContent={showContactThreadHeader ? renderContactHeader(true) : null}
      headerClassName={showContactThreadHeader ? 'vsr-overlay-header--contact-thread' : undefined}
      headerActions={player && (
        <Button
          size="sm"
          variant="tertiary"
          className="vsr-contact-identity-trigger"
          onClick={() => setIdentityOpen(true)}
          aria-label="Open identity"
          title="Identity"
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
          <ContactScrollArea className="vsr-contact-list__items" aria-label="Contacts and system sources">
            <h3 className="vsr-contact-list__section-heading">Characters</h3>
            {characterContacts.length ? characterContacts.map(renderContactItem) : (
              <div className="vsr-contact-list__empty" role="status">
                <span className="vsr-contact-list__empty-icon" aria-hidden="true">contacts</span>
                <strong>No character contacts yet</strong>
                <p>Characters will appear here once encountered or a thread is activated.</p>
              </div>
            )}
            <h3 className="vsr-contact-list__section-heading">System</h3>
            {systemContactEntries.map(renderContactItem)}
          </ContactScrollArea>
        </ContactList>

        <ContactDetail className={!selected || mobileView === 'list' ? 'is-hidden-compact' : ''}>
          {!selected ? (
            <div className="vsr-contact-empty">
              <span className="vsr-contact-empty__icon" aria-hidden="true">{allContacts.length ? 'chat_bubble_outline' : 'contacts'}</span>
              {allContacts.length ? (
                <p>Select a contact to view its conversation threads.</p>
              ) : (
                <>
                  <strong>Your contact list is empty</strong>
                  <p>Characters you encounter or have an activated conversation with will appear here.</p>
                </>
              )}
            </div>
          ) : (
            <>
              {!showContactThreadHeader && renderContactHeader()}

              {profileOpen && (
                <div className="vsr-contact-info-panel" role="region" aria-label="Contact details">
                  <ContactScrollArea className="vsr-contact-info-panel__scroll">
                    <ContactProfile character={selected} />
                  </ContactScrollArea>
                </div>
              )}
              <ContactScrollArea className="vsr-contact-detail-content" aria-hidden={profileOpen || undefined}>
                {activeArea === 'threads' ? (
                  <ContactTopicList aria-label={'Threads for ' + (selected.name || selected.id)}>
                    {threads.length ? threads.map(thread => (
                      <button
                        type="button"
                        className={'vsr-contact-thread' + (thread.isUnread ? ' is-unread' : '')}
                        key={thread.id}
                        onClick={() => openThread(thread)}
                        disabled={Boolean(pendingThreadId)}
                        aria-label={'Open thread ' + thread.title}
                      >
                        <span className="vsr-contact-thread__icon" aria-hidden="true">
                          {thread.isUnread ? 'mark_chat_unread' : 'chat_bubble_outline'}
                        </span>
                        <span className="vsr-contact-thread__copy">
                          <span className="vsr-contact-thread__title">{thread.title}</span>
                          <span className="vsr-contact-thread__preview">{thread.preview}</span>
                        </span>
                        {thread.isUnread && <span className="vsr-contact-thread__unread" aria-label="Unread" />}
                        {pendingThreadId === thread.id && <span className="vsr-contact-thread__pending">Opening…</span>}
                      </button>
                    )) : (
                      <div className="vsr-contact-topic-list__empty">
                        <span className="vsr-contact-topic-list__empty-icon" aria-hidden="true">forum</span>
                        <strong>{selected.kind === 'system' ? 'No content yet' : 'No conversations yet'}</strong>
                        <p>{selected.kind === 'system' ? 'Messages from this source will appear here.' : 'Conversations with this character will appear here.'}</p>
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
                          <strong>{selectedThread?.title || 'Conversation'}</strong>
                          <p>The engine returned no content for this thread.</p>
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
                            {chatPending || chatSession.transitionPending === true ? 'Transitioning…' : 'Tap to continue…'}
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
