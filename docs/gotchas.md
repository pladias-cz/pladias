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

### File Downloads vs JSON Errors
- `TraitExportController.complexExportResult` answers with a **file stream**
  (`application/x-download` + `Content-disposition`) on success and with `JsonResult.error(...)`
  on failure, so `Export.tsx` has to branch on `res.ok` **and** on `content-type` before reading
  the body (`TraitBaseController.toResult()` still answers `ok("Error during trait export")` as
  plain text when building the file fails).
- Invalid taxon names are returned in the extra `invalidTaxa` field of the error JSON, one name per
  line, and `Export.tsx` renders them in a `<pre>` block so they can be selected, fixed and resubmitted.
- Taxon lists are submitted as urlencoded form data (`fetch` + `URLSearchParams` sends **LF**, while a
  native form submit sends CRLF). The backend therefore splits them on `\R` and trims each line -
  `split("\r\n")` would treat a pasted list as a single taxon name.


---

## See Also
- [Architecture](./architecture.md) - Core architecture concepts
- [Conventions](./conventions.md) - Coding standards and patterns
