# View Transitions DevSpec

## Behavioral Matrix
| State / Action | Expected Behavior |
| --- | --- |
| User navigates between routes | The page transitions smoothly via native View Transitions API instead of a hard refresh. |
| `<head>` generation | The Astro View Transitions router is injected via `<ViewTransitions />`. |
