import React, { useMemo, useState } from 'react';
import { DescriptionList, DescriptionListItem, Drawer, IconButton, Input } from '../../design-system/index.js';
import './note.css';

const STATE_GROUPS = [
  { type: 'boolean', label: 'Boolean' },
  { type: 'number', label: 'Number' },
  { type: 'string', label: 'String' }
];

function BooleanValue({ value }) {
  const truthy = value === true;
  return (
    <span className="vsr-stack vsr-stack--center" aria-label={truthy ? 'True' : 'False'}>
      <span className="material-symbols-rounded" aria-hidden="true">
        {truthy ? 'check_circle' : 'cancel'}
      </span>
    </span>
  );
}

function StateValue({ state }) {
  const displayValue = state.type === 'number'
    ? (typeof state.value === 'number' ? state.value.toLocaleString('en-US', { maximumSignificantDigits: 21 }) : String(state.value ?? '—'))
    : state.type === 'boolean'
      ? String(state.value === true)
      : (state.value === '' || state.value === null || state.value === undefined ? '—' : String(state.value));
  return (
    <span className="vsr-note-state-value">
      {state.type === 'boolean' ? <BooleanValue value={state.value} /> : state.type === 'number' ? <strong>{displayValue}</strong> : <span>{displayValue}</span>}
    </span>
  );
}

function EmptyNoteState({ title, message }) {
  return (
    <section className="vsr-stack vsr-stack--center vsr-stack--gap-2" aria-live="polite">
      <span className="material-symbols-rounded vsr-text-secondary" aria-hidden="true">sticky_note_2</span>
      <h3>{title}</h3>
      <p className="vsr-text-secondary">{message}</p>
    </section>
  );
}

export default function NoteWorkspace({ snapshot, open = false, onClose }) {
  const [search, setSearch] = useState('');
  const globalStates = snapshot?.state?.global;
  // Recompute when Engine publishes a new state revision even if an integration
  // reuses the global-state object reference.
  const stateRevision = snapshot?.stateRevision ?? snapshot?.revision ?? null;
  const states = useMemo(() => {
    if (!globalStates || typeof globalStates !== 'object' || Array.isArray(globalStates)) return [];
    return Object.entries(globalStates).map(([id, state]) => ({
      id,
      title: typeof state?.title === 'string' && state.title.trim() ? state.title.trim() : id,
      type: state?.type,
      value: state?.value
    }));
  }, [globalStates, stateRevision]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return STATE_GROUPS.map(group => ({
      ...group,
      states: states.filter(state => state.type === group.type && (!query || [
        state.title,
        state.id,
        group.label,
        state.type,
        state.value === null || state.value === undefined ? '' : String(state.value)
      ].join(' ').toLocaleLowerCase().includes(query)))
    })).filter(group => group.states.length > 0);
  }, [states, search]);

  const hasStates = states.length > 0;
  const hasResults = filteredGroups.length > 0;

  return (
    <Drawer
      open={open}
      title="Note"
      onClose={onClose}
      size="lg"
      width="min(100vw, 640px)"
      lockScroll
    >
      <div className="vsr-stack vsr-stack--gap-3">
        <div className="vsr-note-search">
          <Input
            placeholder="Search states..."
            leadingIcon="search"
            type="search"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          {search && <IconButton icon="close" label="Clear state search" onClick={() => setSearch('')} />}
        </div>
        {!hasStates ? (
          <EmptyNoteState
            title="No global states"
            message="Global state values will appear here when the scenario defines them."
          />
        ) : !hasResults ? (
          <EmptyNoteState
            title="No matching states"
            message="Try searching by state name, ID, or value."
          />
        ) : filteredGroups.map(group => (
          <section key={group.type} className="vsr-stack vsr-stack--gap-2" aria-label={group.label}>
            <h3>{group.label}</h3>
            <DescriptionList layout="list" gap="comfortable" divided>
              {group.states.map(state => (
                <DescriptionListItem
                  key={state.id}
                  label={state.title}
                  value={<StateValue state={state} />}
                  layout="stacked"
                />
              ))}
            </DescriptionList>
          </section>
        ))}
      </div>
    </Drawer>
  );
}
