import React, { useEffect, useMemo, useState } from 'react';
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
  DescriptionList,
  DescriptionListItem,
  Dialog,
  Drawer,
  Separator,
  Textarea
} from '../../design-system/index.js';

function StatList({ stats = {} }) {
  const entries = Object.entries(stats || {});
  if (!entries.length) return <p>Nhân vật chưa có chỉ số.</p>;

  return (
    <DescriptionList layout="grid" columns="2" gap="comfortable">
      {entries.map(([key, stat]) => (
        <DescriptionListItem
          key={key}
          label={stat?.label || key}
          value={stat?.max === undefined
            ? (Number.isFinite(Number(stat?.current)) ? String(stat.current) : '—')
            : (Number.isFinite(Number(stat?.current)) ? String(stat.current) : '—') + ' / ' + (Number.isFinite(Number(stat?.max)) ? String(stat.max) : '—')}
        />
      ))}
    </DescriptionList>
  );
}

function RelationshipList({ relationships = [], contacts, onSelect }) {
  if (!relationships.length) return <p>Chưa có dữ liệu quan hệ.</p>;

  return (
    <div className="vsr-contact-relationships">
      {relationships.map((relationship, index) => {
        const related = contacts.find(item => item.id === relationship.characterId);
        return (
          <div className="vsr-contact-relationship" key={relationship.characterId || index}>
            <span>{relationship.characterName || relationship.characterId || 'Không xác định'}</span>
            <Badge tone="neutral">{relationship.tag || 'Chưa phân loại'}</Badge>
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
      <header className="vsr-contact-profile__heading">
        <ContactAvatar name={character.name || character.id} avatar={character.avatar} size="lg" />
        <div>
          <h3>{character.name || character.id}</h3>
          <p>{character.id}</p>
          {isPlayer
            ? <Badge tone="success">Danh tính đang điều khiển</Badge>
            : <Badge tone={character.presence === 'present' ? 'success' : 'neutral'}>
                {character.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp'}
              </Badge>}
          {isPlayer && character.identityMode && <Badge tone="info">Faker · {character.identityMode}</Badge>}
        </div>
      </header>
      <Separator />
      <ContactSection>
        <h4>Giới thiệu</h4>
        <p>{character.description || 'Nhân vật chưa có mô tả.'}</p>
      </ContactSection>
      <Separator />
      <ContactSection>
        <h4>Chỉ số</h4>
        <StatList stats={character.stats} />
      </ContactSection>
      <Separator />
      <ContactSection>
        <h4>Quan hệ</h4>
        <RelationshipList relationships={character.relationship || []} contacts={contacts} onSelect={onSelect} />
      </ContactSection>
      {!isPlayer && Number.isFinite(character.metCount) && (
        <p>Số lần gặp danh tính hiện tại: {character.metCount}</p>
      )}
    </div>
  );
}

export default function ContactPanel({ open, onClose, player, contacts = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mobileView, setMobileView] = useState('list');
  const [activeArea, setActiveArea] = useState('topics');
  const [profileOpen, setProfileOpen] = useState(false);

  const allContacts = useMemo(() => [
    ...(player ? [{ ...player, kind: 'player' }] : []),
    ...contacts.map(contact => ({ ...contact, kind: 'contact' }))
  ], [player, contacts]);

  const selected = allContacts.find(contact => contact.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !allContacts.some(contact => contact.id === selectedId)) {
      setSelectedId(null);
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('topics');
    }
  }, [allContacts, selectedId]);

  useEffect(() => {
    if (!open) {
      setMobileView('list');
      setProfileOpen(false);
      setActiveArea('topics');
    }
  }, [open]);

  function selectContact(id) {
    if (!allContacts.some(contact => contact.id === id)) return;
    setSelectedId(id);
    setMobileView('detail');
    setActiveArea('topics');
    setProfileOpen(false);
  }

  function close() {
    setProfileOpen(false);
    onClose?.();
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Messages"
      description="Danh bạ hồ sơ được Engine cung cấp"
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
            {allContacts.map(contact => (
              <ContactListItem
                key={contact.id}
                selected={selectedId === contact.id}
                onClick={() => selectContact(contact.id)}
                aria-label={'Mở hồ sơ ' + (contact.name || contact.id)}
              >
                <ContactAvatar name={contact.name || contact.id} avatar={contact.avatar} />
                <span className="vsr-contact-list-item__copy">
                  <span className="vsr-contact-list-item__name">{contact.name || contact.id}</span>
                  <span className="vsr-contact-list-item__preview">
                    {contact.kind === 'player'
                      ? 'Danh tính đang điều khiển'
                      : contact.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp'}
                  </span>
                </span>
              </ContactListItem>
            ))}
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
              <p>Chọn một liên hệ để xem hồ sơ và các khu vực chi tiết.</p>
            </div>
          ) : (
            <>
              <ContactHeader>
                <Button
                  className={activeArea === 'conversation' ? 'vsr-contact-back is-visible' : 'vsr-contact-back'}
                  size="sm"
                  variant="tertiary"
                  onClick={() => {
                    if (activeArea === 'conversation') setActiveArea('topics');
                    else setMobileView('list');
                  }}
                  aria-label={activeArea === 'conversation' ? 'Quay lại danh sách chủ đề' : 'Quay lại danh sách liên hệ'}
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
                  <small>{activeArea === 'conversation' ? 'Hội thoại' : 'Hồ sơ liên hệ'}</small>
                </button>
                <Button size="sm" variant="tertiary" onClick={() => setProfileOpen(true)}>
                  Thông tin
                </Button>
              </ContactHeader>

              <div className="vsr-contact-tabs" role="tablist" aria-label="Khu vực liên hệ">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeArea === 'topics'}
                  className="vsr-contact-tab"
                  onClick={() => setActiveArea('topics')}
                >
                  Chủ đề
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeArea === 'conversation'}
                  className="vsr-contact-tab"
                  onClick={() => setActiveArea('conversation')}
                >
                  Hội thoại
                </button>
              </div>

              <ContactScrollArea className="vsr-contact-detail-content">
                {activeArea === 'topics' ? (
                  <ContactTopicList>
                    <div className="vsr-contact-topic-list__empty">
                      <strong>Chưa có chủ đề liên hệ</strong>
                      <p>Snapshot hiện tại không cung cấp danh sách thread gắn với liên hệ này. Khu vực này được giữ sẵn theo bố cục Contact của main.</p>
                    </div>
                  </ContactTopicList>
                ) : (
                  <ContactConversation>
                    <div className="vsr-contact-conversation__history" aria-live="polite">
                      <div className="vsr-contact-conversation__empty">
                        <strong>Khung hội thoại</strong>
                        <p>Protocol hiện chỉ cung cấp hội thoại kịch bản qua session.chat và các lệnh chat.next/chat.selectChoice. Nó chưa định nghĩa hội thoại tự do hoặc lựa chọn thread trong danh bạ.</p>
                      </div>
                    </div>
                    <ContactComposer>
                      <div className="vsr-contact-composer__row">
                        <Textarea
                          aria-label="Soạn tin nhắn"
                          placeholder="Soạn tin nhắn…"
                          rows={1}
                          disabled
                        />
                        <Button disabled aria-label="Gửi tin nhắn">Gửi</Button>
                      </div>
                      <p className="vsr-contact-composer__hint">Trình soạn tin đang ở trạng thái placeholder; không gửi command giả lập tới Engine.</p>
                    </ContactComposer>
                  </ContactConversation>
                )}
              </ContactScrollArea>

            </>
          )}
        </ContactDetail>
      </ContactWorkspace>

      <Dialog
        open={profileOpen && Boolean(selected)}
        onClose={() => setProfileOpen(false)}
        title="Profile"
        description="Thông tin hồ sơ từ snapshot Engine"
        size="lg"
      >
        <div className="vsr-contact-info-content">
          <ContactProfile
            character={selected}
            player={player}
            contacts={allContacts}
            onSelect={id => {
              selectContact(id);
              setProfileOpen(true);
            }}
          />
        </div>
      </Dialog>
    </Drawer>
  );
}
