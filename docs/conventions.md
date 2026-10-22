# Conventions

## Purpose

This document defines coding standards and patterns. Follow these conventions to maintain consistency across the codebase.

---

## Java (Backend)

### Project Structure

- **`app/models`**: Ebean ORM entities - represent database tables
- **`app/controllers`**: Thin request handlers - routing, parameter/form binding and mapping of
  service results to `Result`; the processing itself belongs to `app/service`
  - `app/controllers/api/`: Token-authenticated public APIs
- **`app/dto`**: Data Transfer Objects for API responses
- **`app/service`**: Business logic layer (reusable services)
- **`app/repositories`**: Data access layer (complex queries)
- **`app/helpers`**: Utility helpers and formatters

### Controller Patterns

### Authentication Decorators
- `@Authorized`: Session-based authentication (for React controllers)
- `@TokenAuthenticated`: Token-based authentication (for public APIs)

---

## TypeScript (Frontend)

### File Extensions & Strict Mode

- All files use `.tsx` (components) or `.ts` (hooks, services, types). No `.js` files.
- Strict mode is on (`tsconfig.json`). No `any` unless absolutely unavoidable.
- Interfaces over type aliases for object shapes; type aliases for unions and primitives.

### Path Aliases

The only existing alias is `@/` → `src/` (defined in both `frontend/vite.config.ts` and `frontend/tsconfig.app.json`). Other aliases (`@hooks/…`, `@components/…`, `@services/…`, …) do not exist in the codebase – do not add them "just in case".

**Always use aliases**, never relative `../../` imports across feature boundaries.

### Component Architecture

#### File Organization
- One component per file. File name = component name (PascalCase).
- Functional components only (`React.FC<Props>`). No class components – **single exception:** `components/ErrorBoundary.tsx` (React offers only the class API `getDerivedStateFromError`/`componentDidCatch` for catching render errors, section G).
- Props interfaces defined in the same file, above the component.

#### Component Types
```typescript
// Page components (route-level)
export default function AtlasSearch() { ... }

// Reusable UI components
export function FilterPanel({ filters, onChange }) { ... }

// Presentational sub-components (can live in same file if used only there)
const FieldRow = ({ label, value }) => { ... };
```

#### Page Design Pattern
Pages are thin orchestrators — no business logic, only composition of hooks and components:

```typescript
export default function AtlasSearch() {
    // Use hooks for data fetching and state
    const { results, loading, error } = useAtlasSearch(searchParams);

    // Compose components
    return (
        <div className="atlas-search">
            <SearchForm onSubmit={handleSearch} />
            {loading && <LoadingSpinner />}
            {!loading && <ResultsList items={results} />}
        </div>
    );
}
```

### Hooks

#### Location & Naming
- Custom hooks live in `src/hooks/`. File name = hook name (camelCase).
- Example: `useAtlasSearch.ts`, `useTaxonData.ts`

#### Return Value Pattern
- Hooks return a plain object (not an array) so callers can destructure by name:
```typescript
// ✅ Good
function useAtlasSearch(params) {
    return { results, loading, error, refetch };
}

// ❌ Avoid
function useAtlasSearch(params) {
    return [results, loading, error];  // Positional destructuring is confusing
}
```

#### Async Safety
- Declarative data loading (anything a component renders from the server on mount) goes through
  TanStack Query via `src/query/` (`useCatalogQuery` for catalogs, `useQuery` elsewhere). The
  client is configured WITHOUT cache (`staleTime: 0`, `gcTime: 0`, `refetchOnMount: "always"`) –
  catalogs are dynamic data and every mount refetches (decision, refactor.md section J).
  Components in tests are wrapped with `withQueryClient()` from `src/test/`.
- Mutations stay imperative (`await service(...)` inside a handler). On success they refresh the
  affected query via `queryClient.invalidateQueries({queryKey: [...]})` with the same key the
  `useQuery` uses (`Settings`, `RecordComments`), or write the response straight into the cache
  via `setQueryData` when it already is the fresh value (`Record`, `MapDetail`). Editable forms
  keep their draft in local state initialized from query data (`Settings`, `PlayMessagesEditor`).
- **Typeahead search** (`Autocomplete`, `ParentMapAutocomplete`): `useQuery` with the term in
  `queryKey`, `enabled: query.length >= minLength`, `queryFn` reads `signal` (a stale request is
  cancelled), and `placeholderData` keeping previous options only while the context key
  (provider / parent taxon) matches. A context switch bumps a `cacheKey` counter in the key
  instead of clearing options in an effect.
- **Polling with backoff** (`useInstanceMessages`): `state.fetchFailureCount` resets to 0 at
  every fetch start (it counts retries within one fetch), so consecutive-failure backoff is
  derived from the monotonic `errorUpdateCount`/`dataUpdateCount` inside the `refetchInterval`
  callback; `notifyOnChangeProps: "all"` re-renders on every poll result even when the error
  instance is identical.
- The `cancelled`-flag pattern below applies only to the remaining manual imperative loads
  (user-triggered flows: search submit, exports, mutations):
```typescript
useEffect(() => {
    let cancelled = false;

    fetchData().then(data => {
        if (!cancelled) setData(data);
    });

    return () => { cancelled = true; };
}, [deps]);
```

### HTTP Communication (apiClient)

All HTTP communication goes through `src/services/apiClient.ts` – one place for transport, the `JsonResult` envelope and 401/403 handling. Calling `fetch()` (or any HTTP library) directly from components or hooks is forbidden; only `src/services/` modules do I/O.

- **Request helpers:** `apiGet/apiPost/apiPut/apiPatch/apiDelete` – typed, with `params` (query string) and `signal` (AbortController). They return the parsed JSON payload.
- **Envelope:** the `JsonResult` shape (`ApiResult<T>` from `@/models/ApiResponse`) is interpreted by domain service modules (`src/services/*Api.ts`) – a component calls `addUser(input)` or `loadTraits(ids, {signal})` and never parses `{success, data|message|error}` itself. HTTP 200 with `success: false` is visible to the service (user settings use it as "value not set"); `ensureSuccess` throws for endpoints where it means an error.
- **Errors:** HTTP failures (including 401 → redirect to `/login`, 403 → central handler, network failures → central handler; both wired by section F) are thrown as `ApiError`; `apiErrorMessage(err, fallback)` picks the backend message or a localized fallback for the UI. `ApiError.notified` marks errors already shown to the user centrally (403, network) – `notifyApiError` then skips them, so the same message is never toasted twice. Background requests with graceful fallback (heartbeat, project name) pass `silent: true` to suppress the central network-error notification.
- **Named gotcha helpers** (docs/gotchas.md): `apiPostFormUrlencoded` (LF semantics of taxon lists), `apiGetLegacyString` (TraitsController bare string response), `apiDownload` (JSON error inside a file stream, Content-Type check).
- **Multipart:** `FormData` is passed to `apiPost` without a Content-Type header – the browser adds the multipart boundary.
- **Cancellation:** `isAbortError(err)` detects aborted requests (fetch throws a DOMException with `name === "AbortError"`).

### State Management

Where state lives – decision tree; use the first rule that fits:

1. **Server data → service hooks** (`useTableData` and friends, section D). Never keep global copies of server data in client state.
2. **Global client state → zustand** (`create` + selectors; e.g. notifications (section F), map layers (`layerStore.ts`)).
3. **App-wide read-only configuration → React Context** (user, instance config, project name) – always consumed via a typed hook (`useUser()`, `useInstanceConfig()`, `useProjectName()`), never directly from the raw context.
4. **Everything else stays local** – `useState`/`useReducer` inside the component; lift state only when there is a real shared need (rule of three).

New global state is created only exceptionally and must be justified in the PR description. Enforced by code review, not by lint rules.

### Error Handling & Resilience

Rules for failures and recovery:

- **Boundary for the unexpected, notifications for the expected.** Errors from rendering propagate to `ErrorBoundary` (`Layout.tsx` around `<Outlet/>`, `App.tsx` around `Suspense`) – do not wrap every `try/catch` in UI into a notification. Expected failures (403, validation, network) are shown to the user, ideally via the notification system (section F).
- **`console.error` is for developers, never the only reaction.** Every user-facing action that can fail must produce a visible feedback (notification / inline error state). A silent `console.error` as the only handler is a bug.
- **Session expiry (401)** is handled centrally in `apiClient` (redirect to backend `/login`) – never per-component.
- **Confirmations** use `useConfirm()` (`src/hooks/useConfirm.tsx` + `components/ConfirmDialog.tsx`): `if (!(await confirm({message: t("...")}))) return;` and render `{dialog}` once in the component root. Native `window.confirm`/`window.alert` are forbidden (blocking, not localizable, visually foreign).
- **Instance heartbeat** (`useInstanceMessages`) is the only polling loop for instance status messages – it pauses in hidden tabs and backs off on failures (docs/gotchas.md „Instance heartbeat“). Do not add another `setInterval` polling of `/api/react/*` endpoints; hook the new data onto the existing pattern instead.
- **Stable React keys:** keys are derived from content (`instanceMessageKey`), never from array index when the list can change order.

#### Notifications (`stores/notificationStore.ts`, section F)

One-off user feedback (action success/failure) goes through the global notification store – no local `useState<Flash>` duplicates. Maintenance messages from `useInstanceMessages` go into the same store via `FlashMessages` – toasts on first load, on returning to the tab and on content change (no permanent banner).

- **Push from components:** `const {push} = useNotifications()`; from non-React code (services, `App.tsx` handler wiring) use the imperative `pushNotification(input)`.
- **Auto-dismiss:** success/info/warning disappear after 5 s; **danger stays until dismissed** (the user must notice it). A custom `timeout` (ms, `0` = sticky) overrides the default.
- **Who may push:** a component/service right after finishing a user action (success and contextual errors), and `apiClient` centrally for 403 + network failures (handlers wired in `App.tsx`). 401 redirects; everything else is the caller's business.
- **No duplicates:** in a `catch` of an apiClient-based call use `notifyApiError(err, fallback)` – it skips errors with `ApiError.notified` (already centrally shown) and aborted requests. Raw-`fetch` legacy code (still being migrated, docs/todo.md) pushes directly – it never sees `ApiError`.
- **Catches are never mute:** a `catch` of an apiClient-based call always ends with `notifyApiError(err, fallback)` (or an equivalent notification) – `console.*` alone is not error handling. Inline error state is reserved for form field validation; failed actions and loads go through the notification store.
- **Rich-text (`html`)** is reserved for trusted backend content (import messages with links, `window.__FLASH__`); plain text uses `message`. `<Toasts />` (`Layout.tsx`, outside `ErrorBoundary`) renders the stack.
- **Trusted HTML renders only via `RichTextMessage`** (`components/RichTextMessage.tsx`, section K): the single component allowed to use `dangerouslySetInnerHTML`. The only exceptions are map popup templates (OpenLayers). Never pass user-composed strings to it; sanitization is deliberately not a dependency (backend-generated content).

### Styling

- SCSS with BEM-like naming: `.block__element--modifier`
- Vendor/framework styles (Bootstrap, bootstrap-icons, react-bootstrap-typeahead, Leaflet) are imported only in the entry point `index.tsx` – never inside components
- Icons use the `bi-*` (bootstrap-icons) font set; do not add other icon libraries
- Bootstrap 5 utility classes are used freely for layout/spacing
- Custom classes for anything semantic

Example:
```scss
.taxonomy-tree {
    padding: 1rem;

    &__item {
        margin-bottom: 0.5rem;
    }

    &__item--selected {
        font-weight: bold;
    }
}
```

### Inline Field Pattern

For editable fields, use the **click-to-edit inline pattern** (similar to `TaxonEditCard.tsx`):

- Fields display as read-only text with a pencil icon (✏️) on hover
- Click anywhere on the field or icon to enter edit mode
- Edit mode shows an input field with auto-focus
- Save on **blur** or **Enter** key
- Cancel on **Escape** key
- No explicit save/cancel buttons visible (cleaner UI)
- Shows a spinner while saving
- Displays error messages inline if save fails

Example usage:
```tsx
<RecordInlineField
    label={t("pages.atlas.record.locality")}
    recordId={record.id}
    field="LOCALITY"
    value={record.locality}
    onUpdated={(v) => handleSave('LOCALITY', v)}
    lastEditTimestamp={record.lastEditTimestampNum || 0}
/>
```

Supported types:
- `text` (default) - Simple text input
- `select` - Dropdown with options
- `boolean` - Toggle switch (always visible, no edit mode)
- `multi-value` - Tag-based input for multiple values

For read-only fields (no edit permission), render as simple text with labels.

---

## Git Workflow

### Commit Messages
- Use imperative mood, present tense: `Fix facet filter`, not `Fixed`
- Be descriptive but concise
- Reference issue numbers when applicable

### Branch Strategy
- No direct commits to `main`; use feature branches
- Feature branch naming: `feature/description`, `fix/description`, `refactor/description`

### Pre-commit Checklist
- Run `npm run build` before committing — TypeScript errors must be zero
- Run `npm run lint` to check code style
- Ensure all tests pass

---

## See Also
- [Architecture](./architecture.md) - Core architecture concepts
- [Gotchas](./gotchas.md) - Known pitfalls and lessons learned
