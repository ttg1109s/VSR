import React, { useMemo, useState } from 'react';
import { Button, Drawer, Grid, IconButton, Input, Menu, Popover } from '../../design-system/index.js';

const PAGE_SIZE = 24;

function EmptyInventoryState({ title = 'Your inventory is empty', message = "You haven't collected any items yet. Explore the world and collect items to see them here." }) {
  return (
    <section className="vsr-stack vsr-stack--center vsr-stack--gap-3" aria-live="polite">
      <span className="material-symbols-rounded vsr-text-secondary" aria-hidden="true">
        backpack
      </span>
      <h2>{title}</h2>
      <p className="vsr-text-secondary">{message}</p>
    </section>
  );
}

function InventoryItemCard({ item, onViewDetails, onToggleEquipment, onUseItem, busy }) {
  const iconName = typeof item.icon === 'string'
    && /^[a-z][a-z0-9_]*$/.test(item.icon)
    ? item.icon
    : 'inventory_2';
  const categoryLabel = item.category === 'uncategorized'
    ? 'Uncategorized'
    : item.category;

  return (
    <Menu
      className="vsr-inventory-item-menu"
      label={`Actions for ${item.name || 'item'}`}
      trigger={
        <article
          className="vsr-card vsr-inventory-item"
          role="button"
          tabIndex={0}
          aria-label={`${item.name || 'Item'}${item.equipped ? ', equipped' : ''}${item.broken ? ', broken' : ''}. Open item actions`}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <span className="material-symbols-rounded vsr-inventory-item__icon" aria-hidden="true">
            {iconName}
          </span>
          <div className="vsr-inventory-item__info">
            <h3 title={item.name || ''}>{item.name}</h3>
            {categoryLabel && <p title={categoryLabel} className="vsr-text-secondary">{categoryLabel}</p>}
          </div>
          {(item.equipped || item.broken) && (
            <span className={'vsr-inventory-item__status-badge' + (item.broken ? ' is-broken' : ' is-equipped')} aria-label={item.broken ? 'Broken' : 'Equipped'} title={item.broken ? 'Broken' : 'Equipped'}>
              {item.broken ? 'B' : 'E'}
            </span>
          )}
        </article>
      }
      items={[
        {
          key: 'equipment',
          label: item.equipped ? 'Unequip' : 'Equip',
          icon: item.equipped ? 'remove_circle_outline' : 'check_circle_outline',
          disabled: busy || (!item.equipped && item.canEquip === false),
          onSelect: () => onToggleEquipment(item)
        },
        ...(item.equipped && item.hasUseEffect ? [{
          key: 'use',
          label: 'Use',
          icon: 'touch_app',
          disabled: busy || item.canUse === false,
          onSelect: () => onUseItem(item)
        }] : []),
        {
          key: 'details',
          label: 'View Details',
          icon: 'info',
          onSelect: () => onViewDetails(item)
        }
      ]}
    />
  );
}

function InventoryItemDetails({ item, onBack, onToggleEquipment, busy }) {
  if (!item) return null;
  const usage = item.usage;
  const iconName = typeof item.icon === 'string' && /^[a-z][a-z0-9_]*$/.test(item.icon) ? item.icon : 'inventory_2';
  const categoryLabel = item.category === 'uncategorized' ? 'Uncategorized' : item.category;
  const usageRatio = usage && Number.isFinite(Number(usage.current)) && Number(usage.max) > 0
    ? Math.max(0, Math.min(100, (Number(usage.current) / Number(usage.max)) * 100))
    : null;
  const usageRemainingRatio = usageRatio !== null ? 100 - usageRatio : null;
  const usageRemainingCount = usage && Number(usage.max) > 0 && Number.isFinite(Number(usage.current))
    ? Math.max(0, Math.min(Number(usage.max), Number(usage.max) - Number(usage.current)))
    : null;
  const usageStatus = usageRatio !== null && Array.isArray(usage?.status) && usage.status.length > 0
    ? (() => {
      const statuses = usage.status
        .map(entry => Array.isArray(entry) && entry.length >= 2 && Number.isFinite(Number(entry[0]))
          ? { threshold: Number(entry[0]), label: String(entry[1]) }
          : null)
        .filter(Boolean)
        .sort((a, b) => a.threshold - b.threshold);
      return statuses.find(entry => usageRatio <= entry.threshold)?.label || (item.broken ? 'Broken' : 'Normal');
    })()
    : item.broken
      ? 'Broken'
      : usage
        ? 'Normal'
        : null;
  const equipDisabled = busy || (!item.equipped && item.canEquip === false);

  return (
    <div className="vsr-inventory-item-details">
      <header className="vsr-inventory-item-details__hero">
        <span className="material-symbols-rounded vsr-inventory-item-details__icon" aria-hidden="true">{iconName}</span>
        <h2>{item.name || 'Item'}</h2>
        <p className="vsr-inventory-item-details__category">{categoryLabel || 'Uncategorized'}</p>
        <div className="vsr-inventory-item-details__badges">
          {item.broken && <span className="vsr-inventory-item-details__badge vsr-inventory-item-details__badge--warning"><span className="material-symbols-rounded" aria-hidden="true">warning</span>Broken</span>}
          <span className="vsr-inventory-item-details__badge"><span className="material-symbols-rounded" aria-hidden="true">{item.equipped ? 'check_circle' : 'inventory_2'}</span>{item.equipped ? 'Equipped' : 'Not equipped'}</span>
        </div>
      </header>

      {item.description && (
        <section className="vsr-inventory-item-details__section">
          <h3><span className="material-symbols-rounded" aria-hidden="true">description</span>Description</h3>
          <p>{item.description}</p>
        </section>
      )}

      {usage && (
        <section className="vsr-inventory-item-details__section">
          <h3><span className="material-symbols-rounded" aria-hidden="true">bar_chart</span>Status</h3>
          <div className="vsr-inventory-item-details__metric">
            <span className="vsr-text-secondary">{usageStatus || 'Normal'}</span>
            <strong>{usageRemainingCount !== null ? `${usageRemainingCount} / ${usage.max}` : `${usage.current} / ${usage.max}`}</strong>
          </div>
          {usageRemainingRatio !== null && <div className="vsr-inventory-item-details__progress" role="progressbar" aria-valuenow={usageRemainingRatio} aria-valuemin="0" aria-valuemax="100" aria-label="Remaining condition"><span className={item.broken ? 'is-broken' : ''} style={{ width: `${usageRemainingRatio}%` }} /></div>}
          {item.broken && <p className="vsr-inventory-item-details__warning"><span className="material-symbols-rounded" aria-hidden="true">error</span>Broken</p>}

        </section>
      )}

      {item.requirements?.hasRequirements && (
        <section className="vsr-inventory-item-details__section">
          <h3><span className="material-symbols-rounded" aria-hidden="true">rule</span>Requirements</h3>
          <p>{item.requirements.passed === false ? 'Requirements not met' : item.requirements.passed === true ? 'Requirements met' : 'Not evaluated'}</p>
        </section>
      )}

      {Array.isArray(item.stats) && item.stats.length > 0 && (
        <section className="vsr-inventory-item-details__section">
          <h3><span className="material-symbols-rounded" aria-hidden="true">analytics</span>Stats</h3>
          <div className="vsr-inventory-item-details__stats">{item.stats.map(stat => {
            const current = Number(stat.current);
            const max = Number(stat.max);
            const hasProgress = stat.current !== null && stat.current !== undefined && stat.max !== null && stat.max !== undefined && Number.isFinite(current) && Number.isFinite(max) && max > 0;
            const progress = hasProgress ? Math.max(0, Math.min(100, (current / max) * 100)) : null;
            return (
              <div className="vsr-inventory-item-details__stat" key={stat.id}>
                <div className="vsr-inventory-item-details__stat-value">
                  <dt>{stat.label}</dt>
                  <dd>{stat.current === null || stat.current === undefined ? '—' : stat.current}{stat.max !== null && stat.max !== undefined ? ` / ${stat.max}` : ''}</dd>
                </div>
                {progress !== null && (
                  <div className="vsr-inventory-item-details__stat-progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" aria-label={stat.label}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            );
          })}</div>
        </section>
      )}

    </div>
  );
}
function FilterGroup({ label, value, options, onChange, className = '' }) {
  return (
    <section className={`vsr-inventory-filter-group ${className}`}>
      <h3 className="vsr-inventory-filter-group__label">{label}</h3>
      <div className="vsr-inventory-filter-options" role="group" aria-label={label}>
        {options.map(option => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className="vsr-inventory-filter-chip"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InventoryFilters({
  category,
  onCategoryChange,
  categories,
  equipment,
  onEquipmentChange,
  sort,
  onSortChange
}) {
  return (
    <div className="vsr-inventory-filter-panel">
      <FilterGroup
        label="Category"
        value={category}
        onChange={onCategoryChange}
        options={[
          { value: 'all', label: 'All' },
          ...categories.map(value => ({ value, label: value === 'uncategorized' ? 'Uncategorized' : value }))
        ]}
      />
      <div className="vsr-inventory-filter-divider" aria-hidden="true" />
      <FilterGroup
        label="Equipment"
        value={equipment}
        onChange={onEquipmentChange}
        options={[
          { value: 'all', label: 'All items' },
          { value: 'equipped', label: 'Equipped' },
          { value: 'unequipped', label: 'Not equipped' }
        ]}
      />
      <div className="vsr-inventory-filter-divider" aria-hidden="true" />
      <FilterGroup
        label="Sort"
        className="vsr-inventory-filter-group--sort"
        value={sort}
        onChange={onSortChange}
        options={[
          { value: 'name-asc', label: 'A–Z' },
          { value: 'name-desc', label: 'Z–A' },
          { value: 'category-asc', label: 'Category' }
        ]}
      />
    </div>
  );
}

function InventoryControls({ search, onSearchChange }) {
  return (
    <div className="vsr-inventory-controls">
      <Input
        placeholder="Search inventory..."
        leadingIcon="search"
        type="search"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
      />
    </div>
  );
}

function InventoryPagination({ page, pageCount, onPageChange }) {
  if (pageCount <= 1) return null;

  return (
    <nav className="vsr-stack vsr-stack--gap-2" aria-label="Inventory pages">
      <div className="vsr-stack vsr-stack--center vsr-stack--gap-1">
        <p className="vsr-text-secondary" aria-live="polite">
          Page {page} of {pageCount}
        </p>
      </div>
      <div className="vsr-stack vsr-stack--gap-2">
        <Grid columns="2" gap="2">
          <Button
            variant="secondary"
            size="md"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="md"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </Grid>
      </div>
    </nav>
  );
}

function InventoryHandPanel({ items, handCount, handLimit, offset, onOffsetChange, onViewDetails }) {
  const visibleSlots = 3;
  const maxOffset = Math.max(0, items.length - visibleSlots);
  const safeOffset = Math.min(offset, maxOffset);
  const visibleItems = items.slice(safeOffset, safeOffset + visibleSlots);
  return (
    <section className="vsr-inventory-hand" aria-label="Equipped items in Hand">
      <header className="vsr-inventory-hand__header"><h3>Hand</h3><span className="vsr-text-secondary">{handCount}{handLimit ? ` / ${handLimit}` : ''} equipped</span></header>
      <div className="vsr-inventory-hand__carousel">
        <Button variant="secondary" size="sm" disabled={safeOffset <= 0} onClick={() => onOffsetChange(Math.max(0, safeOffset - 1))} aria-label="Previous hand slot">Prev</Button>
        <div className="vsr-inventory-hand__slots" aria-live="polite">
          {visibleItems.length === 0 ? <div className="vsr-inventory-hand__empty">No items equipped</div> : visibleItems.map(item => (
            <article className="vsr-inventory-hand__slot" key={item.id}>
              <button type="button" className="vsr-inventory-hand__item" onClick={() => onViewDetails(item)} aria-label={`View ${item.name} details`}>
                <span className="material-symbols-rounded" aria-hidden="true">{typeof item.icon === 'string' && /^[a-z][a-z0-9_]*$/.test(item.icon) ? item.icon : 'inventory_2'}</span><span title={item.name}>{item.name}</span>
              </button>
            </article>
          ))}
        </div>
        <Button variant="secondary" size="sm" disabled={safeOffset >= maxOffset} onClick={() => onOffsetChange(Math.min(maxOffset, safeOffset + 1))} aria-label="Next hand slot">Next</Button>
      </div>
    </section>
  );
}

export default function InventoryWorkspace({ snapshot, client, open = false, onClose, onError }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = Array.isArray(inventory?.items) ? inventory.items : null;
  const handItems = items?.filter(item => item.equipped) || [];
  const [handOffset, setHandOffset] = useState(0);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);

  const [pendingItemId, setPendingItemId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const liveDetailItem = detailItem && items
    ? items.find(item => item.id === detailItem.id) || detailItem
    : detailItem;

  const categories = useMemo(() => {
    if (!items) return [];
    return [...new Set(items.map(item => item.category).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];

    const query = search.trim().toLocaleLowerCase();
    const result = items.filter(item => {
      const searchableText = [
        item.name,
        item.category,
        item.description
      ].filter(Boolean).join(' ').toLocaleLowerCase();

      if (query && !searchableText.includes(query)) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (equipment === 'equipped' && !item.equipped) return false;
      if (equipment === 'unequipped' && item.equipped) return false;
      return true;
    });

    return result.sort((a, b) => {
      if (sort === 'name-desc') {
        return String(b.name || '').localeCompare(String(a.name || ''));
      }
      if (sort === 'category-asc') {
        const categoryOrder = String(a.category || '').localeCompare(String(b.category || ''));
        return categoryOrder || String(a.name || '').localeCompare(String(b.name || ''));
      }
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [items, search, category, equipment, sort]);

  const pageCount = Math.ceil(filteredItems.length / PAGE_SIZE);
  const currentPage = Math.min(page, Math.max(1, pageCount));
  const pageItems = filteredItems.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );
  const firstItem = filteredItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, filteredItems.length);

  const resetPage = setter => value => {
    setter(value);
    setPage(1);
  };

  async function useInventoryItem(item) {
    if (!client?.useItem || pendingItemId) {
      if (!client?.useItem) onError?.('Inventory actions are unavailable.');
      return;
    }
    setPendingItemId(item.id);
    try {
      await client.useItem(item.id);
    } catch (error) {
      onError?.(error?.message || 'Unable to use this item.');
    } finally {
      setPendingItemId(null);
    }
  }

  async function toggleItemEquipment(item) {
    if (!client?.toggleHand || pendingItemId) {
      if (!client?.toggleHand) onError?.('Inventory actions are unavailable.');
      return;
    }
    setPendingItemId(item.id);
    try {
      await client.toggleHand(item.id);
    } catch (error) {
      onError?.(error?.message || 'Unable to update this item.');
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <>
    <Drawer
      open={open}
      title={liveDetailItem ? "Inventory Details" : "Inventory"}
      onClose={onClose}
      size="lg"
      width="min(100vw, 760px)"
      lockScroll
      contentClassName="vsr-inventory-drawer-content"
      headerContent={liveDetailItem ? (
        <div className="vsr-inventory-details-header">
          <IconButton icon="arrow_back" label="Back to Inventory" onClick={() => setDetailItem(null)} className="vsr-inventory-details-header__back" />
          <h2>Inventory Details</h2>
        </div>
      ) : undefined}
      headerActions={!liveDetailItem ? (
        <Popover align="end" label="Inventory filters" trigger={<IconButton icon="tune" label="Inventory filters" />}>
          <InventoryFilters category={category} onCategoryChange={resetPage(setCategory)} categories={categories} equipment={equipment} onEquipmentChange={resetPage(setEquipment)} sort={sort} onSortChange={resetPage(setSort)} />
        </Popover>
      ) : undefined}
    >
      {liveDetailItem ? (
        <InventoryItemDetails
          item={liveDetailItem}
          onBack={() => setDetailItem(null)}
          onToggleEquipment={toggleItemEquipment}
          busy={pendingItemId === liveDetailItem.id}
        />
      ) : !inventory || !items ? (
        <EmptyInventoryState
          title="Inventory unavailable"
          message="Inventory data is not available yet."
        />
      ) : items.length === 0 ? (
        <EmptyInventoryState />
      ) : (
        <>
        <div className="vsr-inventory-layout">
          <InventoryControls
            search={search}
            onSearchChange={resetPage(setSearch)}
          />

          <div className="vsr-inventory-results">
            <div className="vsr-inventory-results__meta">
              <p className="vsr-text-secondary" aria-live="polite">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
              </p>
              {filteredItems.length > 0 && (
                <p className="vsr-text-secondary">
                  Showing {firstItem}–{lastItem} of {filteredItems.length}
                </p>
              )}
            </div>

          {filteredItems.length === 0 ? (
            <EmptyInventoryState
              title="No matching items"
              message="Try changing your search or filters."
            />
          ) : (
            <>
              <Grid columns="auto" gap="3" className="vsr-inventory-items-grid" aria-label="Inventory items">
                {pageItems.map(item => (
                  <InventoryItemCard
                    key={item.id}
                    item={item}
                    busy={pendingItemId === item.id}
                    onViewDetails={setDetailItem}
                    onToggleEquipment={toggleItemEquipment}
                    onUseItem={useInventoryItem}
                  />
                ))}
              </Grid>
              <InventoryPagination
                page={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
              />
            </>
          )}
          </div>
        </div>
        <InventoryHandPanel items={handItems} handCount={inventory.handCount ?? handItems.length} handLimit={inventory.handLimit} offset={handOffset} onOffsetChange={setHandOffset} onViewDetails={setDetailItem} />
        </>
      )}
    </Drawer>

    </>
  );
}
