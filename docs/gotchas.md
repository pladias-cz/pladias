# Gotchas

Known pitfalls, non-obvious behaviours, and lessons learned. Read this before making changes.

---

## Architecture & Migration

### Legacy vs React Confusion
- **Don't mix rendering modes**: A feature should be either fully legacy (Scala.html) or fully React. Don't try to embed React in Scala.html templates or vice versa.
- **Check existing routes first**: Before adding a new controller, verify if one already exists in `app/controllers/` for React features.
- **Route prefixes matter**:
  - `/*` → React SPA pages
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

Known exceptions (do not copy, frontend has to tolerate them):
- `TraitsController.delete` and `TraitsController.importResult` return a bare JSON **string**
  (`ok(Json.toJson(message))`) with HTTP 200 on success instead of `JsonResult`; errors use
  `notFound(JsonResult.error(...))`. Frontend code therefore checks `res.ok` and reads either
  a string or `json.message`.
- Import/validation error messages (`TraitsController.ImportFailed` / `ValidationFailed`)
  contain an HTML `<a>` link to the workbook with highlighted error rows, so `FeatureDetail`
  renders them with `dangerouslySetInnerHTML`.


---

## See Also
- [Architecture](./architecture.md) - Core architecture concepts
- [Conventions](./conventions.md) - Coding standards and patterns
