import React, { useMemo, useState } from 'react';
import './inventory.css';
import { Badge, Button, DataTable, DescriptionList, DescriptionListItem, Dialog, Grid, Input, Select, Drawer } from '../../design-system/index.js';

const formatNumber = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US').format(value) : '—';

export default function InventoryWorkspace({ snapshot, client, onClose, onError }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = inventory?.items || [];
  const owners = inventory?.owners || [];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('name');
  const [selectedId, setSelectedId] = useState(null);
  const [pending, setPending] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const selected = items.find(item => item.id === selectedId) || null;
  const categories = useMemo(() => [...new Set(items.map(item => item.category || 'uncategorized'))].sort(), [items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('en-US');
    return items.filter(item =>
      (category === 'all' || item.category === category) &&
      (!q || item.name.toLocaleLowerCase('en-US').includes(q) || item.description.toLocaleLowerCase('en-US').includes(q))
    ).sort((a,b) => sort === 'category'
      ? a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      : sort === 'usage'
        ? (b.usage?.current ?? -1) - (a.usage?.current ?? -1)
        : a.name.localeCompare(b.name));
  }, [items, query, category, sort]);

  async function run(itemId, action, task) {
    if (pending) return;
    setPending(itemId+'-'+action);
    try {
      await task();
    } catch (error) {
      onError?.(error?.message || 'The inventory action could not be completed.');
    } finally {
      setPending('');
    }
  }

  if (!inventory) return <Drawer open title="Inventory" onClose={onClose} size="lg">
    <p role="status">Inventory data is not available in this snapshot. Refresh the Engine snapshot and try again.</p>
  </Drawer>;

  return <>
    <Drawer open title="Inventory" description="Items owned by the active player character." onClose={onClose} size="lg">
      <div className="vsr-inventory">
        <div className="vsr-inventory__summary" aria-label="Inventory capacity">
          <div><span>Items</span><strong>{formatNumber(inventory.itemCount)}</strong>{inventory.inventoryLimit && <small>of {formatNumber(inventory.inventoryLimit)}</small>}</div>
          <div><span>Equipped</span><strong>{formatNumber(inventory.handCount)}</strong>{inventory.handLimit && <small>of {formatNumber(inventory.handLimit)}</small>}</div>
          <div><span>Character</span><strong className="vsr-inventory__owner">{owners.find(owner => owner.id === inventory.ownerId)?.name || inventory.ownerId}</strong></div>
        </div>
        <div className="vsr-inventory__toolbar">
          <Input aria-label="Search inventory" placeholder="Search items" value={query} onChange={event => setQuery(event.target.value)} leadingIcon="search"/>
          <Select aria-label="Sort inventory" value={sort} onChange={event => setSort(event.target.value)} options={[{value:'name',label:'Name'},{value:'category',label:'Category'},{value:'usage',label:'Usage'}]} placeholder={null}/>
        </div>
        <div className="vsr-inventory__filters" aria-label="Item categories">
          <Button size="sm" variant={category==='all'?'primary':'secondary'} onClick={()=>setCategory('all')}>All ({items.length})</Button>
          {categories.map(value=><Button key={value} size="sm" variant={category===value?'primary':'secondary'} onClick={()=>setCategory(value)}>{value}</Button>)}
        </div>
        {filtered.length ? <Grid columns="responsive-cards" gap="3">
          {filtered.map(item=><button key={item.id} type="button" className="vsr-inventory-card" onClick={()=>setSelectedId(item.id)} aria-label={'View '+item.name}>
            <span className="vsr-inventory-card__icon" aria-hidden="true">{item.icon || 'inventory_2'}</span>
            <span className="vsr-inventory-card__name">{item.name}</span>
            <span className="vsr-inventory-card__meta">{item.category}</span>
            <span className="vsr-inventory-card__badges">
              {item.equipped && <Badge tone="success">Equipped</Badge>}
              {item.broken && <Badge tone="warning">Broken</Badge>}
              {item.requirements?.passed === false && <Badge tone="danger">Requirements unmet</Badge>}
            </span>
          </button>)}
        </Grid> : <div className="vsr-inventory__empty" role="status">{items.length ? 'No items match these filters.' : 'Your inventory is empty.'}</div>}
        {owners.length > 1 && <section className="vsr-inventory__owners">
          <h3>Other characters</h3>
          <p>Items remain owned by their character. Select an item from your active inventory to transfer it to another character.</p>
          <ul>{owners.filter(owner=>owner.id!==inventory.ownerId).map(owner=><li key={owner.id}>{owner.name}<span>{owner.itemCount} items</span></li>)}</ul>
        </section>}
      </div>
    </Drawer>
    <Drawer open={!!selected} title={selected?.name || 'Item details'} description={selected?.category || ''} onClose={()=>{setSelectedId(null);setTransferOpen(false);}} size="md">
      {selected && <div className="vsr-inventory__detail">
        <div className="vsr-inventory__hero"><span aria-hidden="true">{selected.icon || 'inventory_2'}</span><div><h3>{selected.name}</h3><Badge tone={selected.equipped?'success':'neutral'}>{selected.equipped?'Equipped':'Owned'}</Badge></div></div>
        {selected.description && <p>{selected.description}</p>}
        <DescriptionList layout="grid" columns="2" divided>
          <DescriptionListItem label="Category" value={selected.category}/>
          <DescriptionListItem label="Usage" value={selected.usage ? formatNumber(selected.usage.current)+' / '+formatNumber(selected.usage.max) : 'Not tracked'}/>
          <DescriptionListItem label="Requirements" value={!selected.requirements?.hasRequirements?'None':selected.requirements.passed===true?'Met':selected.requirements.passed===false?'Not met':'Unable to evaluate'}/>
          <DescriptionListItem label="Status" value={selected.broken?'Broken':'Available'}/>
        </DescriptionList>
        {selected.stats?.length>0 && <section><h3>Stats</h3><DataTable columns={[{key:'label',header:'Stat'},{key:'current',header:'Current',render:row=>formatNumber(row.current)},{key:'max',header:'Maximum',render:row=>formatNumber(row.max)}]} rows={selected.stats} rowKey="id"/></section>}
        <div className="vsr-inventory__actions">
          <Button disabled={!!pending || (!selected.equipped && !selected.canEquip)} loading={pending===selected.id+'-equip'} onClick={()=>run(selected.id,'equip',()=>client.toggleHand(selected.id))}>{selected.equipped?'Unequip':'Equip'}</Button>
          <Button variant="secondary" disabled={!!pending || !selected.canUse} loading={pending===selected.id+'-use'} onClick={()=>run(selected.id,'use',()=>client.useItem(selected.id))}>Use item</Button>
          <Button variant="tertiary" disabled={!!pending} onClick={()=>setTransferOpen(true)}>Transfer</Button>
          <Button variant="danger" disabled={!!pending} onClick={()=>run(selected.id,'remove',()=>client.removeInventoryItem(selected.id).then(()=>setSelectedId(null)))}>Remove</Button>
        </div>
        {selected.requirements?.passed===false && <p className="vsr-inventory__notice" role="status">Requirements are not met. Equip and use actions are disabled.</p>}
        {selected.broken && <p className="vsr-inventory__notice" role="status">This item has reached its usage limit. Whether it can still be used is controlled by the Engine.</p>}
      </div>}
    </Drawer>
    <Dialog open={transferOpen && !!selected} title="Transfer item" description="Move this item from the active character to another character." onClose={()=>setTransferOpen(false)}>
      <div className="vsr-inventory__transfer">
        <Select label="Target character" value={transferTarget} onChange={event=>setTransferTarget(event.target.value)} options={owners.filter(owner=>owner.id!==inventory.ownerId).map(owner=>({value:owner.id,label:owner.name+' ('+owner.itemCount+' items)'}))} placeholder="Choose a character"/>
        <div className="vsr-inventory__actions">
          <Button variant="secondary" onClick={()=>setTransferOpen(false)}>Cancel</Button>
          <Button disabled={!transferTarget || !!pending} loading={!!pending} onClick={()=>run(selected.id,'transfer',async()=>{await client.transferInventoryItem(selected.id,transferTarget);setTransferOpen(false);setSelectedId(null);setTransferTarget('');})}>Transfer item</Button>
        </div>
      </div>
    </Dialog>
  </>;
}
