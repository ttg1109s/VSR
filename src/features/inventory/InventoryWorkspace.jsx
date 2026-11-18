import React from 'react';
import { Drawer, Input } from '../../design-system/index.js';

export default function InventoryWorkspace({ open = false, onClose }) {
  return (
    <Drawer
      open={open}
      title="Inventory"
      onClose={onClose}
      size="lg"
      width="min(100vw, 760px)"
      lockScroll
    >
      <Input
        type="search"
        placeholder="Search items..."
        leadingIcon="search"
        aria-label="Search items"
      />
    </Drawer>
  );
}
