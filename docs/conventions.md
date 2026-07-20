# Conventions

## Purpose

This document defines coding standards and patterns for both legacy MVC and modern React components. Follow these conventions to maintain consistency across the codebase.

---

## Java (Backend)

### Project Structure

- **`app/models`**: Ebean ORM entities - represent database tables
- **`app/controllers`**: Request handlers containing business logic
  - `app/controllers/react/`: JSON API controllers for React frontend
  - `app/controllers/reactBase/`: Base classes for React controllers
  - `app/controllers/api/`: Token-authenticated public APIs
  - Other controllers: Legacy server-side rendering controllers
- **`app/dto`**: Data Transfer Objects for API responses
- **`app/service`**: Business logic layer (reusable services)
- **`app/repositories`**: Data access layer (complex queries)
- **`app/helpers`**: Utility helpers and formatters

### Controller Patterns

#### Legacy Controllers (Server-Side Rendering)
```java
public Result index(...) {
    // Fetch data
    List<Taxon> taxons = Taxon.find.all();
    // Render Scala.html template
    return ok(views.atlas.index.render(taxons));
}
```

#### React API Controllers (JSON Responses)
```java
@Authorized  // Session-based authentication
public class TaxonController extends ControllerBase {
    
    @Inject
    private ITaxonService taxonService;
    
    public Result getTaxon(long id) {
        TaxonDto taxon = TaxonSearchService.getTaxonDto(id);
        if (taxon == null) {
            return notFound(JsonResult.error("Taxon not found"));
        }
        return ok(JsonResult.buildSuccess(taxon));
    }
}
```

### Authentication Decorators
- `@Authorized`: Session-based authentication (for React controllers)
- `@TokenAuthenticated`: Token-based authentication (for public APIs)

### DTO Best Practices
- Keep DTOs flat and simple
- Convert entities to DTOs before returning JSON
- Use DTOs to hide internal entity structure

---

## TypeScript (Frontend)

### File Extensions & Strict Mode

- All files use `.tsx` (components) or `.ts` (hooks, services, types). No `.js` files.
- Strict mode is on (`tsconfig.json`). No `any` unless absolutely unavoidable.
- Interfaces over type aliases for object shapes; type aliases for unions and primitives.

### Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@types` | `src/types/index.ts` |
| `@/types/facets` | `src/types/facets.ts` |
| `@/types/suggestion` | `src/types/suggestion.ts` |
| `@services/api` | `src/services/api.ts` |
| `@hooks/...` | `src/hooks/...` |
| `@components/...` | `src/components/...` |
| `@pages/...` | `src/pages/...` |

**Always use aliases**, never relative `../../` imports across feature boundaries.

### Component Architecture

#### File Organization
- One component per file. File name = component name (PascalCase).
- Functional components only (`React.FC<Props>`). No class components.
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
- Hooks that manage async state include a `cancelled` flag in `useEffect` cleanup:
```typescript
useEffect(() => {
    let cancelled = false;
    
    fetchData().then(data => {
        if (!cancelled) setData(data);
    });
    
    return () => { cancelled = true; };
}, [deps]);
```

### Styling

- SCSS with BEM-like naming: `.block__element--modifier`
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
