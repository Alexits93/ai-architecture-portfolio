# Architecture Visualization

This document provides a living visualization of the repository's feature-sliced design (FSD) architecture and component hierarchy.

## Component Tree

```mermaid
flowchart TD
    %% Layers
    subgraph Pages ["Pages (Layer)"]
        Index["src/pages/index.astro"]
    end
    
    subgraph Widgets ["Widgets (Layer)"]
        Header["Header (src/widgets/header)"]
        NavigatorMenu["NavigatorMenu (src/widgets/navigator-menu)"]
    end
    
    subgraph Shared ["Shared (Layer)"]
        UIStore["UI Store (src/shared/stores/ui)"]
    end
    
    %% Relationships
    Index --> Header
    Index --> NavigatorMenu
    
    Header --> UIStore
    NavigatorMenu --> UIStore
```

## State Management

- **UI Store (`isMenuOpen`, `themeStore`)**: Managed via Nano Stores in `src/shared/stores/ui`. Both `Header` and `NavigatorMenu` subscribe to this store to handle their layout and visual state reactively across Astro Islands.
