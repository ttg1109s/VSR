import React from 'react';
import { createRoot } from 'react-dom/client';
import NotificationCenter from '../../src/features/notifications/NotificationCenter.jsx';
import '../../src/design-system/index.css';

const calls = [];
const client = {
  markNotificationRead: async id => { calls.push(['read', id]); },
  dismissNotification: async id => { calls.push(['dismiss', id]); },
  markAllNotificationsRead: async () => { calls.push(['read-all']); }
};
const notifications = [
  { id: 'n1', title: 'Unread system notice', message: 'System message body', category: 'system', source: 'engine', read: false, status: 'active', level: 'info', createdAt: Date.now() },
  { id: 'n2', title: 'Story update', message: 'Scenario-authored message', category: 'story', source: 'scenario', read: true, status: 'active', level: 'success', createdAt: Date.now() - 86400000 },
  { id: 'n3', title: 'Engine notice with Story category', message: 'Category metadata does not change the trusted Engine source', category: 'story.quest', source: 'engine', read: false, status: 'active', level: 'info', createdAt: Date.now() - 43200000 }
];
function Fixture() {
  return <NotificationCenter open notifications={notifications} client={client} onClose={() => {}} soundEnabled onSoundChange={() => {}} />;
}
createRoot(document.getElementById('root')).render(<Fixture />);
window.__notifyCalls = calls;
