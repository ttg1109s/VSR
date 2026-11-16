import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ContactAvatar,
  ContactDetail,
  ContactHeader,
  ContactList,
  ContactListItem,
  ContactScrollArea,
  ContactSection,
  ContactWorkspace,
  DescriptionList,
  DescriptionListItem,
  Dialog,
  Drawer,
  Separator,
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
    }
  }, [allContacts, selectedId]);

  useEffect(() => {
    if (!open) {
      setMobileView('list');
      setProfileOpen(false);
    }
  }, [open]);

  function selectContact(id) {
    if (!allContacts.some(contact => contact.id === id)) return;
    setSelectedId(id);
    setMobileView('detail');
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
                      : contact.presence === 'present'
                        ? 'Đang hiện diện'
                        : `Đã gặp · ${Number.isFinite(contact.metCount) ? contact.metCount : 0} lần`}
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
              <span className="vsr-contact-empty__icon" aria-hidden="true">account_circle</span>
              <p>Chọn một liên hệ để xem hồ sơ và các khu vực chi tiết.</p>
            </div>
          ) : (
            <>
              <ContactHeader>
                <Button
                  className="vsr-contact-back"
                  size="sm"
                  variant="tertiary"
                  onClick={() => {
                    setMobileView('list');
                  }}
                  aria-label="Quay lại danh sách liên hệ"
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
                  <small>Hồ sơ nhân vật</small>
                </button>
                <Button size="sm" variant="tertiary" onClick={() => setProfileOpen(true)}>
                  Thông tin
                </Button>
              </ContactHeader>

              <ContactScrollArea className="vsr-contact-detail-content">
                <div className="vsr-contact-empty">
                  <span className="vsr-contact-empty__icon" aria-hidden="true">account_circle</span>
                  <p>Đây là danh bạ hồ sơ chỉ đọc từ Engine. Chọn “Thông tin” để xem mô tả, chỉ số và quan hệ của nhân vật.</p>
                </div>
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
