# Architecture

## Overview

This is a **legacy MVC application** built on the **Java Play! Framework** that is undergoing a gradual transition to a **modern React + API backend** architecture. The application serves as a botanical information system (Pladias) with modules for taxon management, atlas mapping, bibliography, and measurements.

### Key Architectural Characteristics

- **Hybrid Architecture**: Both legacy server-side rendered (Scala.html templates) and modern React SPA coexist
- **Backend**: Java Play! Framework with Ebean ORM, PostgreSQL database
- **Frontend Transition**: Legacy Scala.html views → Modern React 18 + TypeScript
- **API Layer**: RESTful JSON APIs for React frontend (`/api/react/*`)
- **Build System**: SBT (Scala Build Tool) for backend, Vite for frontend

---

## Tech stack

| Layer | Technology                                   |
|-------|----------------------------------------------|
| UI framework | React 18 + TypeScript   (`/frontend`)        |
| Build tool | Vite 7                                       |
| Routing | React Router v7                              | 
| Styling | SCSS + Bootstrap 5                           |
| Backend | Java Play! - including legacy code  (`/app`) |
| Database | PostgreSQL with PostGIS extension            |
| ORM | Ebean JPA                                      |
| Language | Java (backend), TypeScript (frontend)        |

---

## Directory Structure

```
/home/petr/Repositories/Pladias/internal-app/
├── app/                          # Java Play! backend
│   ├── controllers/              # Request handlers
│   │   ├── *.java               # Legacy MVC controllers
│   │   ├── react/               # JSON API controllers for React
│   │   ├── reactBase/           # Base classes for React controllers
│   │   └── api/                 # Token-authenticated API endpoints
│   ├── models/                  # Ebean ORM entities
│   ├── dto/                     # Data Transfer Objects
│   ├── views/                   # Scala.html templates (legacy)
│   │   └── react/               # React mount point templates
│   ├── service/                 # Business logic layer
│   ├── repositories/            # Data access layer
│   ├── helpers/                 # Utility helpers
│   └── ...                      # Other packages (mail, cache, etc.)
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── pages/               # Route-level components
│   │   ├── components/          # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client services
│   │   ├── context/             # React Context providers
│   │   ├── i18n/                # Internationalization
│   │   └── styles/              # SCSS stylesheets
│   ├── package.json
│   └── vite.config.ts
├── public/                       # Static assets
│   └── react/                   # Built React bundle (generated)
├── conf/                         # Play! configuration
│   ├── routes                   # Legacy route definitions
│   ├── react.routes             # React-ready backend route definitions
│   ├── pladias.conf             # Application config
│   └── evolutions/              # Database migrations
└── build.sbt                     # SBT build configuration
```

---

## Core Architecture Concepts

### 1. Dual Rendering Modes

The application operates in two parallel modes during the migration:

#### Legacy Mode (Server-Side Rendering)
- **Entry Point**: `/` (root path)
- **Controllers**: `controllers.Application`, `controllers.Atlas`, `controllers.Search`, etc.
- **Views**: Scala.html templates in `app/views/`
- **Data Flow**: Controller → Model → Scala.html template → HTML response
- **Use Cases**: Legacy features not yet migrated to React

#### React Mode (Client-Side Rendering)
- **Entry Point**: `/react/*` (all React routes)
- **Controllers**: `controllers.react.*` returning JSON
- **Views**: React components in `frontend/src/`
- **Data Flow**: React component → API service → JSON controller → JSON response
- **Use Cases**: New features, migrated modules

### 2. API Design Patterns

#### JSON Result Wrapper
All API responses use a standardized wrapper pattern:

```java
// Success response
ok(JsonResult.buildSuccess(data))

// Error response  
notFound(JsonResult.error("Taxon not found"))
```

#### Authentication
- **Session-based**: For React controllers (`@Authorized` annotation)
- **Token-based**: For public API endpoints (`@TokenAuthenticated` annotation)

#### URL Conventions
- `/api/react/*` → Internal API routes mounted separately
- `/react/*` → React SPA entry points
- `/api/*` → Public token-authenticated APIs

### 3. Frontend Architecture

#### Component Hierarchy
```
App.tsx (root)
├── InstanceConfigProvider (instance-specific settings)
├── UserProvider (authentication state)
├── ProjectNameProvider
└── BrowserRouter
    └── Layout
        ├── ProtectedRoute (module + permission checks)
        └── Page Components (lazy-loaded)
```

#### Module-Based Feature Organization
Features are organized as independent modules with their own routes:
- **Atlas**: Distribution mapping (`/react/atlas/*`)
- **Biblio**: Bibliography management (`/react/biblio/*`)
- **Measurements**: Trait measurements (`/react/measurements/*`)
- **Downloads**: Export functionality (`/react/downloads/*`)
- **User**: User management & settings (`/react/user/*`)

#### State Management
- **React Context**: For global state (user, instance config, project name)
- **Local Component State**: `useState`, `useReducer`
- **Server State**: Fetched via API calls in hooks/components

#### Routing Strategy
- **Lazy Loading**: All pages use `React.lazy()` for code splitting
- **Protected Routes**: Module availability + permission checks at route level
- **Nested Routes**: Feature-specific sub-routes under feature root

### 4. Backend Controllers Pattern

#### Legacy Controllers
```java
public class Atlas extends ControllerBase {
    // Returns Scala.html templates
    public Result index(...) {
        return ok(views.atlas.index.render(...));
    }
}
```

#### React API Controllers
```java
public class TaxonController extends ControllerBase {
    // Returns JSON data
    public Result getTaxon(long id) {
        TaxonDto taxon = TaxonSearchService.getTaxonDto(id);
        return ok(JsonResult.buildSuccess(taxon));
    }
}
```

#### Controller Inheritance
- `ControllerBase`: Common functionality (logging, error handling)
- `@Authorized`: Session authentication decorator
- `@TokenAuthenticated`: Token-based authentication decorator

#### Tabular XLSX Export Of Datatables

React tables export their rows through the very endpoint that serves their JSON:

- The client asks for `Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  and omits `page`/`pageSize`. The controller detects it with
  `TableExportWriter.acceptsXlsx(request)` and answers with the workbook
  (`application/x-download` + `Content-disposition`); pagination is applied only when both
  params are present, so an export request receives all filtered rows. Failures stay JSON.
- Columns are declared by the DTO the endpoint serves, as `List<ExportColumn<Dto>>`
  (`app/service/export/table/`): typed value extractors plus message-key headers, so the workbook
  cannot drift away from the JSON response. `TableExportWriter` renders them with a bold header
  row, native numbers and dates (`dd.MM.yyyy HH:mm`).
- Frontend: `hasExcelExport` on `DataTable` renders the "XLSX all" / "XLSX filtered" buttons
  (`frontend/src/core/dataTable/export/`). Both reuse `buildTableParams`; "all" only leaves out
  the filters typed into the filter row.
- Example: `ImportResultsController.importedReportByUser` and `MapAdminImportController.getImports`
  together with `dto.ExcelBatchDto`.

### 5. Data Layer

#### Ebean ORM Models
```java
@Entity
public class Taxon extends Model {
    @Id
    public Long id;
    
    @Column(name = "name_lat")
    public String nameLat;
    
    // Relationships, queries, etc.
}
```

#### DTO Pattern
- **Purpose**: Decouple API responses from internal entity structure
- **Location**: `app/dto/`
- **Usage**: Controllers convert Entities → DTOs → JSON

#### Repository Pattern
- **Location**: `app/repositories/`
- **Purpose**: Encapsulate complex queries, business rules

### 6. Build & Deployment Pipeline

#### Frontend Build (Vite)
```bash
cd frontend
npm run build       # Produces /public/react/
npm run dev         # Hot module replacement
```

#### Backend Build (SBT)
 
Do no not try to build, will be done by human,

#### Asset Pipeline
- **Vite Output**: `/public/react/` directory
- **Manifest**: `manifest.json` for asset versioning
- **Play! Integration**: Serves built assets via `/assets/react/*`

---

## See Also
- [Conventions](./conventions.md) - Coding standards and patterns
- [Gotchas](./gotchas.md) - Known pitfalls and lessons learned
 