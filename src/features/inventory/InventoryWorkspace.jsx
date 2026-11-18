import React from 'react';
import { Badge, Button, Drawer, Grid, Input, Separator } from '../../design-system/index.js';

export default function InventoryWorkspace({ snapshot, open = false, onClose }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = inventory?.items || [];
  const equippedItems = items.filter(item => item.equipped);

  return (
    <Drawer
      open={open}
      title="Inventory"
      onClose={onClose}
      size="lg"
      width="min(100vw, 760px)"
    >
      <div className="vsr-stack vsr-stack--gap-4">
        <div className="vsr-stack vsr-stack--gap-2">
          <div className="vsr-page-header">
            <span className="vsr-text-secondary">Inventory / Items</span>
            <Badge tone="neutral">{items.length} items</Badge>
          </div>
          <Input aria-label="Search items" placeholder="Search items" disabled />
        </div>

        <section aria-label="Items" className="vsr-stack vsr-stack--gap-3">
          <div className="vsr-page-header">
            <h3>Items</h3>
            <span className="vsr-text-secondary">{items.length} total</span>
          </div>
          {items.length ? (
            <Grid columns="responsive-cards" gap="3">
              {items.map(item => (
                <Button
                  key={item.id}
                  variant="secondary"
                  layout="card"
                  disabled
                  leadingIcon={item.icon || 'inventory_2'}
                >
                  <span className="vsr-button-card__content">
                    <span className="vsr-button-card__title">{item.name || 'Unnamed item'}</span>
                    <span className="vsr-button-card__description">
                      {item.equipped ? 'Equipped' : item.category || 'Item'}
                    </span>
                  </span>
                </Button>
              ))}
            </Grid>
          ) : (
            <div className="vsr-stack vsr-stack--center vsr-stack--gap-2">
              <span className="vsr-text-secondary">Your inventory is empty.</span>
            </div>
          )}
        </section>

        <Separator />

        <section aria-label="Equipped items" className="vsr-stack vsr-stack--gap-3">
          <div className="vsr-page-header">
            <h3>Hand</h3>
            <span className="vsr-text-secondary">{equippedItems.length} equipped</span>
          </div>
          {equippedItems.length ? (
            <Grid columns="auto" gap="2">
              {equippedItems.map(item => (
                <Badge key={item.id} tone="neutral">{item.name || 'Unnamed item'}</Badge>
              ))}
            </Grid>
          ) : (
            <span className="vsr-text-secondary">Nothing equipped.</span>
          )}
        </section>
      </div>
    </Drawer>
  );
}
