# Enterprise Layer Stack Architecture for React + Leaflet Mapping Application

## Background

We are developing a React application for managing floristic occurrence records.

The application contains multiple map views:

- `mapMain` – overview map of the entire country
- `mapDetail` – map of a selected grid/quadrant
- `mapPrevie` – map displayed on a single occurrence record page

The application uses several dozen map layers.

Layers come from multiple GIS servers and use different technologies:

- WMS
- WFS
- GeoJSON (potentially in the future)

Layers may be parameterized, for example:

- `taxonId`
- `yearOfOccurrence`
- `project`
- other future filters

Users can enable/disable layers through a hierarchical layer manager.

Layer visibility preferences are stored on the backend and restored on page load.

---

# Goal

Design and implement an enterprise-grade layer management architecture that:

1. Separates business layer definitions from Leaflet implementation details.
2. Allows reuse of the same layer definitions across multiple map contexts.
3. Supports parameterized layers.
4. Supports multiple map instances simultaneously.
5. Supports backend based persistence of user preferences.
6. Is independent of a specific map rendering library as much as possible.
7. Makes migration to OpenLayers possible in the future.

---

# Architecture Requirements

## 1. Layer Registry

Create a central registry containing all available layer definitions.

Example:

```ts
interface LayerDefinition {
    id: string;
    title: string;

    type: 'wms' | 'wfs' | 'geojson';

    source: string;

    parentId?: string;

    supportsTaxon: boolean;
    supportsYear: boolean;

    defaultVisible: boolean;

    zIndex: number;
}

```
The registry must be the single source of truth.

Map components must never contain hardcoded layer URLs.

## 2. Layer Instances

Separate layer definitions from runtime layer instances.

Example:
```ts
interface LayerInstance {
    layerId: string;

    params: {
        taxonId?: number;
        year?: number;
    };
}
```
Examples:
```ts
occurrences
occurrences(taxon=123)
occurrences(taxon=123, year=2025)
```
## 3. Layer Factory

Implement a factory responsible for creating actual Leaflet layers.

Example:
```ts
class LayerFactory {
    create(
        definition: LayerDefinition,
        params: LayerParams
    ) {
        ...
    }
}
```
No React component should directly create Leaflet WMS/WFS layers.

Forbidden:
```ts
L.tileLayer.wms(...)
```
inside React pages/components.

## 4. Layer State Store

Introduce a centralized state store.

Recommended:

Zustand

Alternative:

Redux Toolkit

Store should manage:
```ts
interface LayerState {
    visible: boolean;
    opacity: number;

    params: {
        taxonId?: number;
        year?: number;
    };
}
```

## 5. User Preferences Persistence

Persist only user configuration of visibility via hook frontend/src/hooks/useUserSettings.js. The logic of backend is to store key-value pairs. For visibility, use key e.g. atlas_layervisibility_mapMain_squars, that is module_feature_page_layer pattern.

Do not persist Leaflet-specific objects.

## 6. Map Context

Introduce map contexts.

Example:
```ts
interface MapContext {
    mapType:
        | 'mainMap'
        | 'detailMap'
        | 'recordMap';

    taxonId?: number;

    year?: number;

    quadrantId?: string;
}
```
The layer factory should derive layer parameters from context whenever possible. 

Example:
```ts
layerFactory.createLayer(
    'occurrences',
    context
);
```

## 7. Hierarchical Layer Tree

Support a tree structure for the layer manager.

Example:
```ts
interface LayerGroup {
    id: string;
    title: string;

    children: Array<
        LayerGroup |
        LayerDefinition
    >;
}
```
Example hierarchy:

Occurrences
 ├─ All occurrences
 ├─ Validated occurrences
 └─ Unvalidated occurrences

Administrative Layers
 ├─ Grid
 ├─ Regions
 └─ Protected Areas
## 8. Layer Cache

Implement caching of runtime layers.

Goal:

Avoid recreating the same WMS/WFS layer when users switch between:

mainMap
→ detailMap
→ mainMap

Possible cache key:

occurrences:123:2025
## 9. Source Adapters

Implement adapters for different GIS servers.

Example:
```ts
interface LayerSourceAdapter {
    createLayer(
        definition: LayerDefinition,
        params: LayerParams
    );
}
```
Implementations:

AtlasAdapter
PladiasAdapter
GbifAdapter

The factory should delegate layer creation to the appropriate adapter.

## 10. Final Desired Flow
Layer Registry
       ↓
Layer State Store
       ↓
Layer Factory
       ↓
Source Adapters
       ↓
Leaflet Renderer

React components should only request layers by ID.

Example:
```ts
showLayer('occurrences');
hideLayer('protectedAreas');
```
React components should not know:

- layer URLs
- WMS parameters
- WFS parameters
- CQL filters
- z-index values
- source-specific implementation details

All of these concerns should be encapsulated inside the layer stack architecture.

Deliverables
- Proposed folder structure.
- TypeScript interfaces.
- Layer registry implementation.
- Zustand store implementation.
- Layer factory implementation.
- Source adapter architecture.
- Layer caching strategy.
- Example integration with React and Leaflet.
- Recommendations for future migration to OpenLayers.
- Identification of potential performance bottlenecks and mitigation strategies.
