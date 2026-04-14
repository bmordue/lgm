## 2025-05-15 - Redundant ARIA Attributes
**Learning:** `aria-required="true"` is redundant when the HTML5 `required` attribute is already present. Modern screen readers automatically derive the required state from the native attribute.
**Action:** Use only the native `required` attribute for form fields to keep the DOM clean and avoid redundancy.

## 2025-05-15 - Lockfile Management
**Learning:** Running `pnpm install` in individual directories (`api/`, `client/`) may generate new `pnpm-lock.yaml` files. These should not be committed unless new dependencies were explicitly added, as they can be very large and clutter PRs.
**Action:** Always check for and discard unintended lockfile changes before submitting.

## 2025-05-15 - SVG Grid Accessibility Pattern
**Learning:** For interactive SVG grids (like the HexGrid), adding `role="button"` and `tabindex="0"` to the `<g>` element, combined with `g:focus-visible .hex-polygon` CSS, provides a robust keyboard navigation experience without breaking visual mouse interactions.
**Action:** Apply this pattern to any future SVG-based interactive components to ensure they are screen-reader and keyboard friendly.

## 2025-05-16 - Non-blocking Feedback Patterns
**Learning:** Replacing disruptive `window.alert()` with non-blocking, accessible inline status messages improves user flow and professional feel. Using `role="status"` for success and `role="alert"` for errors ensures screen reader compatibility while maintaining context.
**Action:** Always prefer integrated UI feedback over native browser dialogs for application-specific state changes.

## 2026-04-07 - Multi-modal Feedback for Planned Actions
**Learning:** Providing both visual (e.g., dashed borders, subtle fills) and semantic (ARIA labels) feedback for planned but not yet committed actions helps users maintain mental context. For maps/grids, highlighting the destination of a move clarifies intent before submission.
**Action:** Always pair visual state changes with descriptive ARIA labels to ensure screen reader users can perceive the same intent as sighted users.

## 2026-04-07 - Self-Identification in Multi-player Lists
**Learning:** In lists of users or players, appending a "(You)" indicator to the current user's name significantly reduces cognitive load by providing an immediate anchor point for self-identification.
**Action:** Apply a consistent "(You)" suffix to the current user in all shared lists or dashboards where multiple identities are displayed.

## 2026-04-09 - Conditional "Clear All" Pattern
**Learning:** For lists where users might want to batch-remove items (like planned moves or cart items), a "Clear All" button significantly improves efficiency. To avoid UI clutter, this button should only be visible when there are at least 2 items, as a single item can be removed via its individual action button.
**Action:** Implement "Clear All" buttons with `v-if="items.length >= 2"` (or equivalent) to maintain a clean interface while providing power-user functionality.

## 2026-04-12 - Multi-modal Self-Identification
**Learning:** Pairing a text suffix like "(You)" with a distinct visual highlight (e.g., brand-colored background and border) significantly improves scannability for sighted users while maintaining clarity for screen readers. Using numeric IDs consistently in both logic and test mocks is crucial for these comparisons to function correctly.
**Action:** When identifying the current user in a list, always use both a textual "(You)" indicator and a CSS-based visual highlight, and ensure ID types (string vs number) match across the stack.

## 2026-04-13 - Accessible Loading States
**Learning:** Loading indicators for async data (like "Loading world data...") must use `role="status"` and `aria-live="polite"` to ensure screen readers announce the state change without being overly disruptive.
**Action:** Always wrap loading messages in a container with these ARIA attributes and apply the project's standard `.loading-state` styling (centered, italic, grey).

## 2025-05-17 - Multi-modal Unit Identification
**Learning:** In complex game maps, pairing textual indicators (e.g., "(You)" in labels) with distinct visual highlights (e.g., a specific stroke color and weight) significantly improves the ability of users to identify their own units. This multi-modal approach supports both scannability for sighted users and clarity for screen readers.
**Action:** Always provide both a text suffix and a visual highlight when identifying the current player's assets in multi-player environments.
