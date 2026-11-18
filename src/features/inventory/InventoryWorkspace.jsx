import React, { useMemo, useState } from 'react';
import { Drawer, Input } from '../../design-system/index.js';

function EmptyInventoryState() {
  return (
    <section className="vsr-stack vsr-stack--center vsr-stack--gap-3" aria-live="polite">
      <div
        className="vsr-card vsr-stack vsr-stack--center vsr-stack--gap-3"
        style={{ width: '100%', padding: '40px 24px', textAlign: 'center' }}
      >
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          style={{ fontSize: '48px', color: 'var(--vsr-text-secondary, #5F6368)' }}
        >
          backpack
        </span>
        <div className="vsr-stack vsr-stack--gap-1">
          <h2 className="vsr-heading-medium">Your inventory is empty</h2>
          <p className="vsr-text-secondary">
            You haven't collected any items yet. Explore the world and collect items to see them here.
          </p>
        </div>
      </div>
      <p className="vsr-text-secondary vsr-text-small" role="note">
        Items you collect during your adventure will automatically appear here.
      </p>
    </section>
  );
}

function NoSearchResults({ onClear }) {
  return (
    <section className="vsr-stack vsr-stack--center vsr-stack--gap-2" aria-live="polite">
      <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: '40px' }}>
        search_off
      </span>
      <h2 className="vsr-heading-medium">No items found</h2>
      <p className="vsr-text-secondary">Try another search term or clear your search.</p>
      <button type="button" className="vsr-button vsr-button--tertiary" onClick={onClear}>
        Clear search
      </button>
    </section>
  );
}

export default function InventoryWorkspace({ snapshot, open = false, onClose }) {
  const [query, setQuery] = useState('');
  const inventory = snapshot?.presentation?.inventory;
  const items = Array.isArray(inventory?.items) ? inventory.items : null;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!normalizedQuery) return items;
    return items.filter(item => [
      item.name,
      item.category,
      item.description
    ].some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery)));
  }, [items, normalizedQuery]);

  const handleClose = () => {
    setQuery('');
    onClose?.();
  };

  return (
    <Drawer
      open={open}
      title="Inventory"
      onClose={handleClose}
      size="lg"
      width="min(100vw, 760px)"
      lockScroll
    >
      {!inventory || !items ? (
        <section className="vsr-stack vsr-stack--center vsr-stack--gap-2" aria-live="polite">
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: '40px' }}>
            inventory_2
          </span>
          <h2 className="vsr-heading-medium">Inventory unavailable</h2>
          <p className="vsr-text-secondary">Inventory data is not available yet.</p>
        </section>
      ) : items.length === 0 ? (
        <div className="vsr-stack vsr-stack--gap-3">
          <EmptyInventoryState />
          <p className="vsr-text-secondary vsr-text-small" aria-label="Item count">0 items</p>
        </div>
      ) : (
        <div className="vsr-stack vsr-stack--gap-3">
          <Input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search items..."
            leadingIcon="search"
            aria-label="Search items"
          />
          {filteredItems.length === 0 ? (
            <NoSearchResults onClear={() => setQuery('')} />
          ) : (
            <section className="vsr-stack vsr-stack--gap-2" aria-label="Inventory items">
              <p className="vsr-text-secondary vsr-text-small" aria-live="polite">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
              {filteredItems.map(item => (
                <article className="vsr-card vsr-stack vsr-stack--gap-1" key={item.id}>
                  <div className="vsr-stack vsr-stack--gap-1">
                    <h2 className="vsr-heading-small">{item.name}</h2>
                    <p className="vsr-text-secondary vsr-text-small">{item.category}</p>
                    {item.description && <p className="vsr-text-body">{item.description}</p>}
                    {item.equipped && <span className="vsr-badge vsr-badge--success">Equipped</span>}
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
