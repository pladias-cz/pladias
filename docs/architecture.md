# Architecture

## Overview

The application serves as a botanical information system (Pladias) with modules for taxon management, atlas mapping, bibliography, and measurements.

### Key Architectural Characteristics

- **Backend**: Java Play! Framework with Ebean ORM, PostgreSQL database
- **Frontend**:  React 19 + TypeScript
- **API Layer**: RESTful JSON APIs for React frontend (`/api/react/*`)
- **Build System**: SBT (Scala Build Tool) for backend, Vite for frontend

---

## Tech stack

| Layer | Technology                                   |
|-------|----------------------------------------------|
| UI framework | React 19 + TypeScript   (`/frontend`)        |
| Build tool | Vite 7                                       |
| Routing | React Router v7                              |
| Styling | SCSS + Bootstrap 5                           |
| Backend | Java Play!  (`/app`) |
| Database | PostgreSQL with PostGIS extension            |
| ORM | Ebean JPA                                      |
| Language | Java (backend), TypeScript (frontend)        |

---


## Core Architecture Concepts

### 1. API Design Patterns

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

### 2. Build & Deployment Pipeline

#### Frontend Build (Vite)
```bash
cd frontend
npm run build       # Produces /public/react/
npm run dev         # Hot module replacement
npm run lint
npm run test
```

#### Backend Build (SBT)

Do no not try to build, will be done by human (`JAVA_HOME=~/.jdks/temurin-21.0.11`)

#### Asset Pipeline
- **Vite Output**: `/public/react/` directory
- **Manifest**: `manifest.json` for asset versioning
- **Play! Integration**: Serves built assets via `/assets/react/*`

---

## See Also
- [Conventions](./conventions.md) - Coding standards and patterns
- [Gotchas](./gotchas.md) - Known pitfalls and lessons learned
