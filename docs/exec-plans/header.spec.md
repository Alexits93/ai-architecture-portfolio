# Spec: Decoupled App Header

## 1. Functional Requirements
The `<Header />` component is a pure presentational and highly decoupled Astro layout element. 
- It must render the primary logo linked to the home route.
- It must render a Theme Toggle button (Dark/Light).
- It must render the trigger for the Navigator Menu.
- **Strict Decoupling:** It must *not* manage the internal state or visibility of the Navigator Menu directly. It will only dispatch state changes via a shared UI store.

## 2. Decoupled Architecture (Astro + Nano Stores)
We will use Nano Stores (`nanostores`) for framework-agnostic, microscopic global state.

```mermaid
flowchart TD
    %% Nano Stores (Global State)
    subgraph State ["Global UI State (Nano Stores)"]
        isMenuOpen[isMenuOpen Store]
        themeState[themeStore]
    end

    %% Astro Components
    subgraph UI ["Astro UI Layer"]
        Header["Header.astro"]
        Nav["NavigatorMenu.astro"]
    end

    %% Decoupled Flow
    Header -- "Writes (Toggles)" --> isMenuOpen
    Header -- "Writes (Toggles)" --> themeState
    isMenuOpen -- "Reads (Reactive)" --> Nav
    
    style State fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
```

## 3. CSS Migration (Pristine Visuals)
The legacy CSS will be imported directly into the `<style>` block of `Header.astro`. The `:host` selector will be mapped to a `.header-wrapper` class to retain visual parity while dropping the Shadow DOM.
