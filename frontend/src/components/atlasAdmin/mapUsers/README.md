# MapUsers Component

Modular implementation of the Map User Administration component using the enterprise DataTable.

## Architecture

```
mapUsers/
├── MapUsers.tsx              # Main component (orchestrator)
├── types.ts                   # TypeScript type definitions
├── hooks/
│   ├── index.ts              # Hook exports
│   ├── useMapUsersData.ts    # Data fetching hook (users + rights)
│   ├── useMapUsersProjects.ts # Project operations hook
│   └── useMapUsersTaxa.ts    # Taxon operations hook
└── components/
    ├── index.ts              # Component exports
    ├── MapUsersFlash.tsx     # Flash message display
    ├── MapUsersProjectsCell.tsx  # Projects column cell renderer
    ├── MapUsersTaxaCell.tsx      # Taxa column cell renderer
    ├── MapUsersAddProjectModal.tsx  # Add project modal
    └── MapUsersAddTaxonModal.tsx    # Add taxon modal with autocomplete
```

## Key Features

- **Custom Data Fetching**: Uses `fetchData` prop of DataTable to efficiently fetch users and their rights in a single operation
- **Modular Design**: Separated concerns into hooks (business logic) and components (UI)
- **Type-Safe**: Full TypeScript support with proper interfaces
- **No Backend Changes**: Works with existing API structure

## Data Flow

1. `DataTable` calls `fetchUsersWithRights` from `useMapUsersData`
2. Hook fetches users from `/api/react/users`
3. Hook fetches rights for visible users from `/api/react/atlasadmin/userrights`
4. Data is merged and returned to DataTable
5. Cell renderers display projects/taxa with action buttons
6. Modals handle add operations via dedicated hooks

## Usage

```tsx
import MapUsers from '@/components/atlasAdmin/MapUsers';

// In your page/route
<MapUsers />
```

## Hooks

### useMapUsersData
Handles data fetching with custom fetcher that combines users and rights.

### useMapUsersProjects
Manages project-related state and operations:
- Project list fetching
- Add/remove project handlers
- Modal state management

### useMapUsersTaxa
Manages taxon-related state and operations:
- Taxon search with debouncing
- Add taxon handler
- Modal state management
 
