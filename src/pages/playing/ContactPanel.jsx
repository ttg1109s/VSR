import React, { useEffect, useMemo, useState } from 'react';
import './ContactPanel.css';
import {
  Badge, Button, DescriptionList, DescriptionListItem, Drawer, Separator
} from '../../design-system/index.js';

function initials(name, id) {
  const value = (name || id || 'P').trim();
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
}

function Avatar({ character, large = false }) {
  return (
    <span className={'vsr-contact-avatar' + (large ? ' vsr-contact-avatar--large' : '')} aria-hidden="true">
      {character?.avatar
        ? <img src={character.avatar} alt="" />
        : initials(character?.name, character?.id)}
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
        const label = relationship.characterName || relationship.characterId || 'Không xác định';
        return (
          <div className="vsr-contact-relationship" key={relationship.characterId || index}>
            <span>{label}</span>
            <Badge tone="neutral" size="sm">{relationship.tag || 'Chưa phân loại'}</Badge>
            {related && <Button size="sm" variant="tertiary" onClick={() => onSelect(related.id)}>Xem hồ sơ</Button>}
          </div>
        );
      })}
    </div>
  );
}

function ContactDetails({ character, player, contacts, onSelect }) {
  if (!character) return <div className="vsr-contact-desktop-empty">Chọn một hồ sơ để xem chi tiết.</div>;
  const isPlayer = character.id === player?.id;
  return (
    <article className="vsr-card vsr-contact-profile">
      <header className="vsr-contact-profile__heading">
        <Avatar character={character} large />
        <div>
          <h3>{character.name || character.id}</h3>
          <p className="vsr-text-secondary">{character.id}</p>
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
    </article>
  );
}

export default function ContactPanel({ open, onClose, player, contacts = [] }) {
  const [selectedId, setSelectedId] = useState(player?.id || null);
  const allContacts = useMemo(() => [
    ...(player ? [{ ...player, kind: 'player' }] : []),
    ...contacts.map(contact => ({ ...contact, kind: 'contact' }))
  ], [player, contacts]);
  const selected = allContacts.find(contact => contact.id === selectedId) || player || null;

  useEffect(() => {
    if (!allContacts.some(contact => contact.id === selectedId)) setSelectedId(player?.id || null);
  }, [allContacts, player?.id, selectedId]);

  const close = () => onClose?.();
  return (
    <Drawer
      open={open}
      onClose={close}
      title="Liên hệ"
      description="Danh tính hiện tại và những nhân vật đã gặp hoặc đang ở cùng địa điểm"
      size="full"
      side="right"
      className="vsr-contact-drawer"
    >
      <div className="vsr-contact-workspace">
        <section className="vsr-card vsr-contact-list" aria-label="Danh sách liên hệ">
          <header>
            <h3>Danh bạ</h3>
            <p>{contacts.length} nhân vật đã biết</p>
          </header>
          <div className="vsr-contact-list__items">
            {allContacts.map(contact => (
              <Button
                key={contact.id}
                variant={selected?.id === contact.id ? 'secondary' : 'tertiary'}
                size="md"
                className="vsr-contact-row"
                aria-pressed={selected?.id === contact.id}
                onClick={() => setSelectedId(contact.id)}
              >
                <Avatar character={contact} />
                <span className="vsr-contact-row__copy">
                  <strong>{contact.name || contact.id}</strong>
                  <small>{contact.kind === 'player' ? 'Danh tính đang điều khiển' : contact.presence === 'present' ? 'Đang hiện diện' : 'Đã gặp'}</small>
                </span>
              </Button>
            ))}
            {!allContacts.length && <p>Snapshot chưa có dữ liệu danh tính hoặc liên hệ.</p>}
          </div>
        </section>
        <section className="vsr-contact-details" aria-label="Chi tiết liên hệ" aria-live="polite">
          <ContactDetails
            character={selected}
            player={player}
            contacts={contacts}
            onSelect={setSelectedId}
          />
        </section>
      </div>
    </Drawer>
  );
}
