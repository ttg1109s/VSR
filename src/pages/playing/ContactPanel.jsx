import React, { useEffect, useMemo, useState } from 'react';
import './ContactPanel.css';
import {
  Badge, Button, DescriptionList, DescriptionListItem, Drawer, Separator
} from '../../design-system/index.js';

function initials(name, id) {
  const value = (name || id || 'P').trim();
  return value.split(/\\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
}

function Avatar({ character, large = false }) {
  return (
    <span className={'vsr-contact-avatar' + (large ? ' vsr-contact-avatar--large' : '')} aria-hidden="true">
      {character?.avatar ? <img src={character.avatar} alt="" /> : initials(character?.name, character?.id)}
    </span>
  );
}

function StatList({ stats = {} }) {
  const entries = Object.entries(stats);
  if (!entries.length) return <p>Nhân vật chưa có chỉ số.</p>;
  return (
    <DescriptionList layout="grid" columns="2" divided>
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
            <Badge tone="neutral" size="sm">{relationship.tag || 'Chưa phân loại'}</Badge>
            {related && <Button size="sm" variant="tertiary" onClick={() => onSelect(related.id)}>Xem hồ sơ</Button>}
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
        <Avatar character={character} large />
        <div>
          <h3>{character.name || character.id}</h3>
          <p>{character.id}</p>
          {isPlayer
            ? <Badge tone="success">Danh tính đang điều khiển</Badge>
            : <Badge tone={character.presence === 'present' ? 'success' : 'neutral'}>{character.presence === 'present' ? 'Đang ở cùng địa điểm' : 'Đã gặp'}</Badge>}
          {isPlayer && character.identityMode && <Badge tone="info">Faker · {character.identityMode}</Badge>}
        </div>
      </header>
      <Separator />
      <section>
        <h4>Giới thiệu</h4>
        <p>{character.description || 'Nhân vật chưa có mô tả.'}</p>
      </section>
      <Separator />
      <section>
        <h4>Chỉ số</h4>
        <StatList stats={character.stats} />
      </section>
      <Separator />
      <section>
        <h4>Quan hệ</h4>
        <RelationshipList relationships={character.relationship || []} contacts={contacts} onSelect={onSelect} />
      </section>
      {!isPlayer && Number.isFinite(character.metCount) && (
        <p className="vsr-text-secondary">Số lần gặp danh tính hiện tại: {character.metCount}</p>
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
      description="Danh tính đang điều khiển và các liên hệ đã được Engine ghi nhận"
      size="full"
      side="right"
      className="vsr-contact-drawer"
    >
      <div className="vsr-contact-workspace">
        <aside className={'vsr-contact-list-panel' + (mobileView === 'detail' && selected ? ' is-hidden-mobile' : '')}>
          <header className="vsr-contact-list-panel__header">
            <h2>Messages</h2>
            <Button size="sm" variant="tertiary" onClick={close} aria-label="Đóng danh bạ">Đóng</Button>
          </header>
          <div className="vsr-contact-list__items" aria-label="Danh sách liên hệ">
            {allContacts.map(contact => (
              <button
                type="button"
                key={contact.id}
                className={'vsr-contact-row' + (selectedId === contact.id ? ' is-selected' : '')}
                aria-current={selectedId === contact.id ? 'true' : undefined}
                onClick={() => selectContact(contact.id)}
              >
                <Avatar character={contact} />
                <span className="vsr-contact-row__copy">
                  <span className="vsr-contact-row__top">
                    <strong>{contact.name || contact.id}</strong>
                  </span>
                  <span className="vsr-contact-row__preview">
                    {contact.kind === 'player'
                      ? 'Danh tính đang điều khiển'
                      : contact.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp'}
                  </span>
                </span>
              </button>
            ))}
            {!allContacts.length && (
              <p className="vsr-contact-list__empty">Snapshot hiện chưa có dữ liệu danh tính hoặc liên hệ.</p>
            )}
          </div>
        </aside>

        <main className={'vsr-contact-detail-panel' + (mobileView === 'detail' && selected ? ' is-visible-mobile' : '')}>
          {!selected ? (
            <div className="vsr-contact-empty">
              <span className="vsr-contact-empty__icon" aria-hidden="true">✉</span>
              <p>Chọn một liên hệ để xem thông tin.</p>
            </div>
          ) : (
            <>
              <header className="vsr-contact-detail-header">
                <Button
                  className="vsr-contact-back"
                  size="sm"
                  variant="tertiary"
                  onClick={() => setMobileView('list')}
                  aria-label="Quay lại danh sách"
                >
                  ←
                </Button>
                <Avatar character={selected} />
                <button type="button" className="vsr-contact-detail-header__identity" onClick={() => setProfileOpen(true)}>
                  <strong>{selected.name || selected.id}</strong>
                  <small>{selected.id}</small>
                </button>
                <Button size="sm" variant="tertiary" onClick={() => setProfileOpen(true)}>Thông tin</Button>
              </header>
              <section className="vsr-contact-detail-content" aria-label="Thông tin liên hệ" aria-live="polite">
                <ContactProfile
                  character={selected}
                  player={player}
                  contacts={allContacts}
                  onSelect={selectContact}
                />
                <p className="vsr-contact-protocol-note">
                  Khu vực hội thoại chưa được hiển thị vì snapshot hiện tại chưa cung cấp protocol cho thread hoặc chat.
                </p>
              </section>
              {profileOpen && (
                <div className="vsr-contact-info-overlay" role="dialog" aria-modal="true" aria-label="Hồ sơ liên hệ">
                  <header>
                    <h2>Profile</h2>
                    <Button size="sm" variant="tertiary" onClick={() => setProfileOpen(false)}>Đóng</Button>
                  </header>
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
              )}
            </>
          )}
        </main>
      </div>
    </Drawer>
  );
}
