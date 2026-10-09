# View Transitions DevSpec

## Behavioral Matrix
| State / Action | Expected Behavior |
| --- | --- |
| User navigates between routes | The page transitions smoothly via native View Transitions API instead of a hard refresh (if supported). |
| CSS configuration | `global.css` includes `@view-transition { navigation: auto; }`. |
| JS Overhead | 0 bytes. We explicitly avoid `<ClientRouter />` to rely purely on CSS natively. |
