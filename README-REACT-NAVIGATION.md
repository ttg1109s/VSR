# VSR navigation and data components

The React design-system navigation/data layer is presentation-only. It does not own scenario state or import the engine/protocol.

## Components

- `Tabs`: controlled or uncontrolled tabs, horizontal/vertical orientation, roving tab focus, arrow/Home/End navigation, automatic or manual activation.
- `TreeView`: nested nodes with stable IDs, expansion state, single selection, keyboard navigation (arrows, Home/End, Enter/Space).
- `DataTable`: semantic table, optional sortable columns, custom cell renderers, empty state, responsive horizontal overflow.
- `Combobox`: searchable single-select listbox, controlled/uncontrolled value, keyboard navigation, clear selection.
- `Badge`: neutral/success/warning/danger/info tones and sizes.
- `Breadcrumb`: semantic navigation landmark and current-page marker.

## Example

```jsx
import { Tabs, TreeView, DataTable, Combobox, Badge, Breadcrumb } from './design-system/index.js';

<Tabs items={[{ value: 'overview', label: 'Overview', content: <Overview /> }]} />
<TreeView nodes={[{ id: 'root', label: 'Root', children: [{ id: 'scene-1', label: 'Scene 1' }] }]} />
<DataTable columns={[{ key: 'name', header: 'Name', sortable: true }]} rows={[{ id: '1', name: 'Opening' }]} />
<Combobox options={[{ value: 'draft', label: 'Draft' }]} onChange={setStatus} label="Status" />
<Badge tone="success">Published</Badge>
<Breadcrumb items={[{ label: 'Workspace', href: '/' }, { label: 'Scenario' }]} />
```

These components should be covered by browser-level accessibility and interaction tests before production use. In particular, verify TreeView focus behavior with deeply nested/large trees, Combobox screen-reader behavior and outside-click dismissal, and DataTable sort semantics for application-specific data.
