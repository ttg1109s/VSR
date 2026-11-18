import React from 'react';
import { Drawer, Grid } from '../../design-system/index.js';

function EmptyInventoryState() {
  return (
    <section className="vsr-stack vsr-stack--center vsr-stack--gap-3" aria-live="polite">
      <span className="material-symbols-rounded vsr-text-secondary" aria-hidden="true">
        backpack
      </span>
      <h2>Your inventory is empty</h2>
      <p className="vsr-text-secondary">
        You haven't collected any items yet. Explore the world and collect items to see them here.
      </p>
    </section>
  );
}

function InventoryItemCard({ item }) {
  return (
    <article className="vsr-card vsr-stack vsr-stack--center vsr-stack--gap-2">
      <span className="material-symbols-rounded" aria-hidden="true">
        {item.icon || 'inventory_2'}
      </span>
      <div className="vsr-stack vsr-stack--center vsr-stack--gap-1">
        <h3>{item.name}</h3>
        <p className="vsr-text-secondary">{item.category}</p>
      </div>
      {item.equipped && (
        <span className="vsr-tag" aria-label="Equipped">
          Equipped
        </span>
      )}
    </article>
  );
}

export default function InventoryWorkspace({ snapshot, open = false, onClose }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = Array.isArray(inventory?.items) ? inventory.items : null;

  return (
    <Drawer
      open={open}
      title="Inventory"
      onClose={onClose}
      size="lg"
      width="min(100vw, 760px)"
      lockScroll
    >
      {!inventory || !items ? (
        <section className="vsr-stack vsr-stack--center vsr-stack--gap-3" aria-live="polite">
          <span className="material-symbols-rounded vsr-text-secondary" aria-hidden="true">
            inventory_2
          </span>
          <h2>Inventory unavailable</h2>
          <p className="vsr-text-secondary">Inventory data is not available yet.</p>
        </section>
      ) : items.length === 0 ? (
        <EmptyInventoryState />
      ) : (
        <div className="vsr-stack vsr-stack--gap-3">
          <p className="vsr-text-secondary" aria-label="Item count">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
          <Grid columns="responsive-dense" gap="3" aria-label="Inventory items">
            {items.map(item => (
              <InventoryItemCard key={item.id} item={item} />
            ))}
          </Grid>
        </div>
      )}
    </Drawer>
  );
}
