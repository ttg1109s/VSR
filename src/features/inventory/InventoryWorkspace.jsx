import React, { useMemo, useState } from 'react';
import { Button, Drawer, Grid, Input, Select } from '../../design-system/index.js';

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

function InventoryItemCard({ item }) {
  return (
    <article className="vsr-card vsr-stack vsr-stack--center vsr-stack--gap-2">
      <span className="material-symbols-rounded" aria-hidden="true">
        {item.icon || 'inventory_2'}
      </span>
      <div className="vsr-stack vsr-stack--center vsr-stack--gap-1">
        <h3>{item.name}</h3>
        {item.category && <p className="vsr-text-secondary">{item.category}</p>}
      </div>
      {item.equipped && (
        <span className="vsr-tag" aria-label="Equipped">
          Equipped
        </span>
      )}
    </article>
  );
}

function InventoryControls({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  equipment,
  onEquipmentChange,
  sort,
  onSortChange
}) {
  return (
    <div className="vsr-stack vsr-stack--gap-3">
      <Input
        label="Search inventory"
        placeholder="Search by item name or description"
        leadingIcon="search"
        type="search"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
      />
      <Grid columns="responsive-cards" gap="3">
        <Select
          label="Category"
          value={category}
          onChange={event => onCategoryChange(event.target.value)}
          options={[
            { value: 'all', label: 'All categories' },
            ...categories.map(value => ({ value, label: value }))
          ]}
          placeholder={null}
        />
        <Select
          label="Equipment"
          value={equipment}
          onChange={event => onEquipmentChange(event.target.value)}
          options={[
            { value: 'all', label: 'All items' },
            { value: 'equipped', label: 'Equipped' },
            { value: 'unequipped', label: 'Not equipped' }
          ]}
          placeholder={null}
        />
        <Select
          label="Sort by"
          value={sort}
          onChange={event => onSortChange(event.target.value)}
          options={[
            { value: 'name-asc', label: 'Name: A to Z' },
            { value: 'name-desc', label: 'Name: Z to A' },
            { value: 'category-asc', label: 'Category: A to Z' }
          ]}
          placeholder={null}
        />
      </Grid>
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

export default function InventoryWorkspace({ snapshot, open = false, onClose }) {
  const inventory = snapshot?.presentation?.inventory;
  const items = Array.isArray(inventory?.items) ? inventory.items : null;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [equipment, setEquipment] = useState('all');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);

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
        <EmptyInventoryState
          title="Inventory unavailable"
          message="Inventory data is not available yet."
        />
      ) : items.length === 0 ? (
        <EmptyInventoryState />
      ) : (
        <div className="vsr-stack vsr-stack--gap-3">
          <InventoryControls
            search={search}
            onSearchChange={resetPage(setSearch)}
            category={category}
            onCategoryChange={resetPage(setCategory)}
            categories={categories}
            equipment={equipment}
            onEquipmentChange={resetPage(setEquipment)}
            sort={sort}
            onSortChange={resetPage(setSort)}
          />

          <div className="vsr-stack vsr-stack--gap-1">
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
              <Grid columns="responsive-dense" gap="3" aria-label="Inventory items">
                {pageItems.map(item => (
                  <InventoryItemCard key={item.id} item={item} />
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
      )}
    </Drawer>
  );
}
