import React, { useState } from 'react';
import { Badge, Drawer } from '../../design-system/index.js';

const placeholderContacts = [
  { id: 'contact-01', name: 'Nhân vật mẫu 01', preview: 'Chưa có tin nhắn', time: '—', initials: '01' },
  { id: 'contact-02', name: 'Nhân vật mẫu 02', preview: 'Chưa có tin nhắn', time: '—', initials: '02' },
  { id: 'contact-03', name: 'Nhân vật mẫu 03', preview: 'Chưa có tin nhắn', time: '—', initials: '03' }
];

function ContactList({ selectedId, onSelect }) {
  return (
    <section className="vsr-contact-list" aria-label="Contact list">
      <div className="vsr-contact-list__toolbar">
        <div>
          <h3>All contacts</h3>
          <p>Danh sách liên hệ sẽ hiển thị tại đây</p>
        </div>
        <Badge tone="neutral">0 unread</Badge>
      </div>
      <div className="vsr-contact-list__items">
        {placeholderContacts.map(contact => (
          <button
            type="button"
            key={contact.id}
            className={'vsr-contact-row' + (selectedId === contact.id ? ' is-selected' : '')}
            onClick={() => onSelect(contact)}
          >
            <span className="vsr-contact-avatar" aria-hidden="true">{contact.initials}</span>
            <span className="vsr-contact-row__copy">
              <span className="vsr-contact-row__top"><strong>{contact.name}</strong><small>{contact.time}</small></span>
              <span className="vsr-contact-row__preview">{contact.preview}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="vsr-contact-placeholder-note">Các liên hệ trên chỉ là dữ liệu mẫu để xem bố cục.</p>
    </section>
  );
}

function ContactDetails({ contact, onBack }) {
  return (
    <section className="vsr-contact-details">
      <header className="vsr-contact-details__header">
        <button type="button" className="vsr-icon-button vsr-contact-back" aria-label="Back to contacts" onClick={onBack}>arrow_back</button>
        <span className="vsr-contact-avatar vsr-contact-avatar--large" aria-hidden="true">{contact.initials}</span>
        <div className="vsr-contact-details__identity">
          <h3>{contact.name}</h3>
          <p>Thông tin nhân vật</p>
        </div>
        <button type="button" className="vsr-icon-button" aria-label="Contact information" disabled>info</button>
      </header>
      <div className="vsr-contact-details__body">
        <div className="vsr-contact-empty">
          <span className="vsr-icon" aria-hidden="true">forum</span>
          <h4>Chưa có hội thoại</h4>
          <p>Các chủ đề trò chuyện và tin nhắn sẽ xuất hiện tại đây khi được kết nối với dữ liệu Engine.</p>
        </div>
        <section className="vsr-contact-profile">
          <h4>Profile</h4>
          <p className="vsr-text-secondary">Thông tin mô tả, chỉ số và mối quan hệ của nhân vật.</p>
          <div className="vsr-contact-profile__placeholder">
            <span>Character description</span>
            <span>Stats</span>
            <span>Relationships</span>
          </div>
        </section>
      </div>
    </section>
  );
}

export default function ContactPanel({ open, onClose }) {
  const [selected, setSelected] = useState(null);
  const close = () => { setSelected(null); onClose?.(); };
  const selectContact = contact => setSelected(contact);
  return (
    <Drawer open={open} onClose={close} title="Messages" description="Contacts and conversations" size="full" side="right" className="vsr-contact-drawer">
      <div className="vsr-contact-workspace">
        <div className={'vsr-contact-workspace__list' + (selected ? ' has-selection' : '')}>
          <ContactList selectedId={selected?.id} onSelect={selectContact}/>
        </div>
        <div className={'vsr-contact-workspace__detail' + (selected ? ' has-selection' : '')}>
          {selected
            ? <ContactDetails contact={selected} onBack={() => setSelected(null)}/>
            : <div className="vsr-contact-desktop-empty"><span className="vsr-icon">chat_bubble_outline</span><p>Select a contact to view details</p></div>}
        </div>
      </div>
    </Drawer>
  );
}
