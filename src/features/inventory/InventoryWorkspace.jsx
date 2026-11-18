import React, { useMemo, useState } from 'react';
import './inventory.css';
import { Badge, Button, DataTable, DescriptionList, DescriptionListItem, Drawer } from '../../design-system/index.js';

const formatNumber = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—';

export default function InventoryWorkspace({ snapshot, client, open = false, onClose, onError }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = inventory?.items || [];
  const equippedItems = items.filter(item => item.equipped);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState('');
  const selected = items.find(item => item.id === selectedId) || null;
  const categories = useMemo(
    () => [...new Set(items.map(item => item.category || 'uncategorized'))].sort(),
    [items]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en-US');
    return items.filter(item =>
      (category === 'all' || item.category === category) &&
      (!q || String(item.name || '').toLocaleLowerCase('en-US').includes(q) ||
        String(item.description || '').toLocaleLowerCase('en-US').includes(q))
    );
  }, [items, query, category]);

  async function run(itemId, action, task) {
    if (pending) return;
    setPending(itemId + '-' + action);
    try {
      await task();
    } catch (error) {
      onError?.(error?.message || 'The inventory action could not be completed.');
    } finally {
      setPending('');
    }
  }

  if (!inventory) return (
    <Drawer open={open} title="Inventory" onClose={onClose} size="lg">
      <p role="status">Inventory data is not available in this snapshot. Refresh the Engine snapshot and try again.</p>
    </Drawer>
  );

  return (
    <>
      <Drawer open={open} title="Inventory" description="Your character's items and equipment." onClose={onClose} size="lg">
        <div className="vsr-inventory">
          <section className="vsr-inventory__character" aria-label="Current character">
            <div className="vsr-inventory__portrait" aria-hidden="true"><span>{(inventory.ownerName || 'P').trim().charAt(0).toLocaleUpperCase()}</span></div>
            <div className="vsr-inventory__character-info">
              <span className="vsr-inventory__eyebrow">PLAYER CHARACTER</span>
              <strong>{inventory.ownerName || 'Character'}</strong>
            </div>
            <div className="vsr-inventory__capacity">
              <strong>{formatNumber(inventory.itemCount)}</strong>
              <span>{inventory.inventoryLimit ? ' / ' + formatNumber(inventory.inventoryLimit) : ' ITEMS'}</span>
              <small>IN BAG</small>
            </div>
          </section>

          <section className="vsr-inventory__equipment" aria-label="Equipped items">
            <div className="vsr-inventory__section-heading">
              <div><span className="vsr-inventory__eyebrow">LOADOUT</span><h3>In hand</h3></div>
              <span>{formatNumber(inventory.handCount)}{inventory.handLimit ? ' / ' + formatNumber(inventory.handLimit) : ''}</span>
            </div>
            <div className="vsr-inventory__equipment-grid">
              {Array.from({ length: Math.max(equippedItems.length, inventory.handLimit || 0, 1) }, (_, index) => {
                const item = equippedItems[index];
                return item ? (
                  <button key={item.id} type="button" className="vsr-inventory__equipment-slot is-filled" onClick={() => setSelectedId(item.id)}>
                    <span className="vsr-inventory__item-icon">{item.icon || 'inventory_2'}</span>
                    <span className="vsr-inventory__slot-label">HAND {index + 1}</span>
                    <strong>{item.name}</strong>
                  </button>
                ) : (
                  <div key={'empty-' + index} className="vsr-inventory__equipment-slot is-empty">
                    <span className="vsr-inventory__item-icon">＋</span>
                    <span className="vsr-inventory__slot-label">HAND {index + 1}</span>
                    <span>Empty</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="vsr-inventory__bag" aria-label="Inventory bag">
            <div className="vsr-inventory__section-heading">
              <div><span className="vsr-inventory__eyebrow">CARRIED ITEMS</span><h3>Backpack</h3></div>
              <span>{formatNumber(items.length)} ITEMS</span>
            </div>
            <div className="vsr-inventory__toolbar">
              <input aria-label="Search items" placeholder="Find an item…" value={query} onChange={event => setQuery(event.target.value)} />
              {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
            </div>
            {categories.length > 1 && (
              <div className="vsr-inventory__filters" aria-label="Item categories">
                <button type="button" className={category === 'all' ? 'is-active' : ''} onClick={() => setCategory('all')}>All</button>
                {categories.map(value => <button key={value} type="button" className={category === value ? 'is-active' : ''} onClick={() => setCategory(value)}>{value}</button>)}
              </div>
            )}
            {filtered.length ? (
              <div className="vsr-inventory__grid">
                {filtered.map(item => (
                  <button key={item.id} type="button" className={'vsr-inventory-card' + (selectedId === item.id ? ' is-selected' : '')} onClick={() => setSelectedId(item.id)} aria-label={'Inspect ' + item.name} aria-pressed={selectedId === item.id}>
                    <span className="vsr-inventory-card__icon">{item.icon || 'inventory_2'}</span>
                    <span className="vsr-inventory-card__name">{item.name}</span>
                    {item.usage && <span className="vsr-inventory-card__quantity">{formatNumber(item.usage.current)} / {formatNumber(item.usage.max)}</span>}
                    <span className="vsr-inventory-card__badges">
                      {item.equipped && <Badge tone="success">Equipped</Badge>}
                      {item.broken && <Badge tone="warning">Broken</Badge>}
                      {item.requirements?.passed === false && <Badge tone="danger">Locked</Badge>}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="vsr-inventory__empty" role="status">{items.length ? 'No items match this search.' : 'Your backpack is empty.'}</div>
            )}
          </section>

          {selected && (
            <section className="vsr-inventory__inspector" aria-label="Selected item">
              <div className="vsr-inventory__inspector-heading">
                <span className="vsr-inventory__item-icon">{selected.icon || 'inventory_2'}</span>
                <div><span className="vsr-inventory__eyebrow">{selected.category || 'ITEM'}</span><h3>{selected.name}</h3></div>
                <button type="button" onClick={() => setSelectedId(null)} aria-label="Close item details">×</button>
              </div>
              {selected.description && <p>{selected.description}</p>}
              <DescriptionList layout="grid" columns="2" divided>
                <DescriptionListItem label="Usage" value={selected.usage ? formatNumber(selected.usage.current) + ' / ' + formatNumber(selected.usage.max) : 'Not tracked'} />
                <DescriptionListItem label="Requirements" value={!selected.requirements?.hasRequirements ? 'None' : selected.requirements.passed === true ? 'Met' : selected.requirements.passed === false ? 'Not met' : 'Unable to evaluate'} />
                <DescriptionListItem label="Status" value={selected.broken ? 'Broken' : 'Available'} />
                <DescriptionListItem label="Equipment" value={selected.equipped ? 'In hand' : 'In backpack'} />
              </DescriptionList>
              {selected.stats?.length > 0 && <section className="vsr-inventory__stats"><h4>Attributes</h4><DataTable columns={[{ key: 'label', header: 'Attribute' }, { key: 'current', header: 'Value', render: row => formatNumber(row.current) }, { key: 'max', header: 'Maximum', render: row => formatNumber(row.max) }]} rows={selected.stats} rowKey="id" /></section>}
              <div className="vsr-inventory__actions">
                <Button disabled={!!pending || (!selected.equipped && !selected.canEquip)} loading={pending === selected.id + '-equip'} onClick={() => run(selected.id, 'equip', () => client.toggleHand(selected.id))}>{selected.equipped ? 'Unequip' : 'Equip'}</Button>
                <Button variant="secondary" disabled={!!pending || !selected.canUse} loading={pending === selected.id + '-use'} onClick={() => run(selected.id, 'use', () => client.useItem(selected.id))}>Use</Button>
                <Button variant="danger" disabled={!!pending} onClick={() => run(selected.id, 'remove', async () => { await client.removeInventoryItem(selected.id); setSelectedId(null); })}>Discard</Button>
              </div>
              {selected.requirements?.passed === false && <p className="vsr-inventory__notice" role="status">You do not meet this item's requirements.</p>}
              {selected.broken && <p className="vsr-inventory__notice" role="status">This item has reached its usage limit. The Engine determines whether it can still be used.</p>}
            </section>
          )}
        </div>
      </Drawer>
    </>
  );
}
