# Gotchas

Known pitfalls, non-obvious behaviours, and lessons learned. Read this before making changes.

---

## Architecture & Migration

### Legacy vs React Confusion
- **Don't mix rendering modes**: A feature should be either fully legacy (Scala.html) or fully React. Don't try to embed React in Scala.html templates or vice versa.
- **Check existing routes first**: Before adding a new controller, verify if one already exists in `app/controllers/react/` for React features.
- **Route prefixes matter**: 
  - `/react/*` → React SPA pages
  - `/api/react/*` → JSON API endpoints
  - `/` → Legacy server-rendered pages

### API Response Format
All JSON responses must use `JsonResult` wrapper:
```java
// ✅ Correct
return ok(JsonResult.buildSuccess(data));

// ❌ Wrong - will break frontend parsing
return ok(data);
```
 
 
---

## See Also
- [Architecture](./architecture.md) - Core architecture concepts
- [Conventions](./conventions.md) - Coding standards and patterns
