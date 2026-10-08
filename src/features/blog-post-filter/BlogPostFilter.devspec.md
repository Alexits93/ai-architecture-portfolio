# BlogPostFilter DevSpec

## Behavior Matrix
| Condition | Behavior |
|---|---|
| Given a list of tags | Renders a `SkillTag` for each, marked as `interactive` |
| Initial render with `selectedTags` | Adds `active` state to the `SkillTag` if it exists in `selectedTags` |
| Click on unselected tag | Toggles its visual `active` state on, adds it to internal selected list, dispatches `filter-tag-selected` event with `selectedTags` payload |
| Click on selected tag | Toggles its visual `active` state off, removes it from internal selected list, dispatches `filter-tag-selected` event with updated payload |

## Technical Constraints
- Extends Astro's client-side standard via custom elements (`<blog-post-filter>`).
- Dispatches custom event `filter-tag-selected` for external systems (e.g., actual post lists) to listen to.
- Relies on `src/shared/ui/skill-tag` for visual rendering.
- No `any` or `unknown`.
- 100% Vitest coverage.
