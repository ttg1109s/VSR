import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/design-system/index.css';
import { Dialog, Menu } from '../../src/design-system/index.js';

function OverlayFixture() {
  const [outerOpen, setOuterOpen] = useState(false);
  const [nestedOpen, setNestedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <button id="outer-trigger" type="button" onClick={() => setOuterOpen(true)}>Open dialog</button>
      <Dialog
        open={outerOpen}
        onClose={() => setOuterOpen(false)}
        title="Outer dialog"
        description="Outer dialog description"
      >
        <button id="nested-trigger" type="button" onClick={() => setNestedOpen(true)}>Open nested dialog</button>
        <button id="outer-action" type="button">Outer action</button>
        <Dialog
          open={nestedOpen}
          onClose={() => setNestedOpen(false)}
          title="Nested dialog"
          description="Nested dialog description"
        >
          <button id="nested-action" type="button">Nested action</button>
        </Dialog>
      </Dialog>
      <Menu
        trigger={<button id="menu-trigger" type="button">Open menu</button>}
        items={[{ key: 'first', label: 'First item', onSelect: () => {} }]}
        onOpenChange={setMenuOpen}
      />
      <output id="menu-state">{String(menuOpen)}</output>
      <button id="outside" type="button">Outside</button>
    </>
  );
}

createRoot(document.getElementById('root')).render(<OverlayFixture />);
