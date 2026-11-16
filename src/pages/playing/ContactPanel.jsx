import React, { useState } from 'react';
import { Drawer } from '../../design-system/index.js';

function initials(name, id) {
  const value = (name || id || 'P').trim();
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P';
}

function Avatar({ name, id, src, large = false }) {
  return (
    <span className={'vsr-contact-avatar' + (large ? ' vsr-contact-avatar--large' : '')} aria-hidden="true">
      {src ? <img src={src} alt="" /> : initials(name, id)}
    </span>
  );
}

function ContactList({ player, selectedId, onSelect }) {
  return (
    <section className="vsr-contact-list" aria-label="Contact list">
      <div className="vsr-contact-list__toolbar">
        <div>
          <h3>All contacts</h3>
          <p>Thông tin người chơi và danh tính</p>
        </div>
      </div>
      {player ? (
        <div className="vsr-contact-list__items">
          <button
            type="button"
            className={'vsr-contact-row' + (selectedId === player.id ? ' is-selected' : '')}
            onClick={() => onSelect(player)}
          >
            <Avatar name={player.name} id={player.id} src={player.avatar} />
            <span className="vsr-contact-row__copy">
              <span className="vsr-contact-row__top"><strong>{player.name}</strong><small>Player</small></span>
              <span className="vsr-contact-row__preview">Personal Stats</span>
            </span>
          </button>
        </div>
      ) : (
        <div className="vsr-contact-list__empty">Chưa có dữ liệu nhân vật người chơi trong snapshot.</div>
      )}
    </section>
  );
}

function ContactDetails({ player, currentIdentity, onBack }) {
  const stats = Object.entries(player?.stats || {});
  const relationships = Array.isArray(player?.relationship) ? player.relationship : [];
  const identityChanged = currentIdentity && currentIdentity.id !== player?.id;

  return (
    <section className="vsr-contact-details">
      <header className="vsr-contact-details__header">
        <button type="button" className="vsr-icon-button vsr-contact-back" aria-label="Quay lại danh sách" onClick={onBack}>arrow_back</button>
        <Avatar name={player?.name} id={player?.id} src={player?.avatar} large />
        <div className="vsr-contact-details__identity">
          <h3>{player?.name || 'Player'}</h3>
          <p>Player Entry · Nhân vật ban đầu</p>
        </div>
      </header>
      <div className="vsr-contact-details__body">
        <section className="vsr-contact-profile">
          <div className="vsr-contact-profile__heading">
            <Avatar name={player?.name} id={player?.id} src={player?.avatar} large />
            <div>
              <h3>{player?.name || 'Player'}</h3>
              <p className="vsr-text-secondary">Entry Character · {player?.id}</p>
            </div>
          </div>
          <h4>Giới thiệu</h4>
          <p>{player?.description || 'Nhân vật chưa có mô tả.'}</p>
        </section>

        {identityChanged && (
          <section className="vsr-contact-profile vsr-contact-current-identity">
            <h4>Current Identity</h4>
            <div className="vsr-contact-profile__heading">
              <Avatar name={currentIdentity.name} id={currentIdentity.id} src={currentIdentity.avatar} />
              <div>
                <strong>{currentIdentity.name}</strong>
                <p className="vsr-text-secondary">{currentIdentity.id}{currentIdentity.identityMode ? ' · Faker: ' + currentIdentity.identityMode : ''}</p>
              </div>
            </div>
            <p>Danh tính hiện đang được Engine sử dụng. Player Entry vẫn giữ thông tin nhân vật ban đầu.</p>
          </section>
        )}

        <section className="vsr-contact-profile">
          <h4>Chỉ số</h4>
          {stats.length ? (
            <div className="vsr-contact-stats">
              {stats.map(([key, stat]) => {
                const current = Number(stat?.current);
                const max = Number(stat?.max);
                const percent = Number.isFinite(current) && Number.isFinite(max) && max > 0
                  ? Math.max(0, Math.min(100, current / max * 100))
                  : 0;
                const color = /^#[0-9a-fA-F]{6}$/.test(stat?.color || '') ? stat.color : 'var(--vsr-color-primary)';
                const accessibleValue = Number.isFinite(current) && Number.isFinite(max) && max > 0
                  ? Math.max(0, Math.min(max, current))
                  : 0;
                return (
                  <div className="vsr-contact-stat" key={key}>
                    <div className="vsr-contact-stat__label">
                      <strong>{stat?.label || key}</strong>
                      <span>{Number.isFinite(current) ? current : '—'}{Number.isFinite(max) ? ' / ' + max : ''}</span>
                    </div>
                    <div className="vsr-contact-stat__track" role="progressbar" aria-label={stat?.label || key} aria-valuemin="0" aria-valuemax={Number.isFinite(max) && max > 0 ? max : 100} aria-valuenow={accessibleValue}>
                      <span style={{ width: percent + '%', background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p>Nhân vật chưa có chỉ số.</p>}
        </section>

        <section className="vsr-contact-profile">
          <h4>Quan hệ</h4>
          {relationships.length ? (
            <div className="vsr-contact-relationships">
              {relationships.map((relationship, index) => (
                <div className="vsr-contact-relationship" key={relationship.characterId || index}>
                  <strong>{relationship.characterName || relationship.characterId || 'Không xác định'}</strong>
                  <span>{relationship.tag || 'Chưa phân loại'}</span>
                </div>
              ))}
            </div>
          ) : <p>Chưa có dữ liệu quan hệ.</p>}
        </section>
      </div>
    </section>
  );
}

export default function ContactPanel({ open, onClose, player, currentIdentity }) {
  const [selected, setSelected] = useState(false);
  const close = () => { setSelected(false); onClose?.(); };
  return (
    <Drawer open={open} onClose={close} title="Contacts" description="Player profile and identity" size="full" side="right" className="vsr-contact-drawer">
      <div className="vsr-contact-workspace">
        <div className={'vsr-contact-workspace__list' + (selected ? ' has-selection' : '')}>
          <ContactList player={player} selectedId={selected ? player?.id : null} onSelect={() => setSelected(true)} />
        </div>
        <div className={'vsr-contact-workspace__detail' + (selected ? ' has-selection' : '')}>
          {selected && player
            ? <ContactDetails player={player} currentIdentity={currentIdentity} onBack={() => setSelected(false)} />
            : <div className="vsr-contact-desktop-empty"><span className="vsr-icon">account_circle</span><p>Chọn Player Entry để xem hồ sơ</p></div>}
        </div>
      </div>
    </Drawer>
  );
}
