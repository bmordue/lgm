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

## 2026-04-18 - Cohesive Multi-modal Self-Identification
**Learning:** For complex game interfaces, self-identification must be consistent across both spatial (grid/map) and textual (lists/sidebars) representations. Using the project's brand color for both provides a unified mental model for ownership.
**Action:** Always synchronize map highlights (e.g., `.is-own-actor`) with sidebar highlights (e.g., `.is-self`) using shared color tokens and the "(You)" textual suffix.

## 2026-04-20 - Cross-Component Feedback for Planned Actions
**Learning:** Implementing hover/focus cross-highlighting between lists and spatial maps (e.g., highlighting a destination hex when hovering over a move in the sidebar) creates a much more tactile and intuitive experience. This reduces cognitive load when reviewing multiple planned actions.
**Action:** When a list represents actions on a map, always implement two-way visual feedback where hovering a list item highlights its spatial target.

## 2026-04-20 - Animated State Changes for Interactive Lists
**Learning:** Using `<TransitionGroup>` to animate the addition and removal of items in interactive lists (like move planning) provides subtle but important visual feedback that an action was successful. This makes the interface feel responsive and modern.
**Action:** Always use transitions when items are dynamically added to or removed from user-managed lists to improve the perceived smoothness of the UI.

## 2026-04-22 - Cross-Component Highlight Correlation
**Learning:** Implementing cross-highlighting between textual lists (sidebars) and spatial representations (maps/grids) drastically reduces the cognitive effort required to correlate data. Converting static list items to buttons/interactive elements allows keyboard users to participate in this discovery via focus.
**Action:** When displaying a list of entities that also appear on a map, always implement two-way highlighting on hover and focus to strengthen the mental link between the two views.

## 2026-04-24 - Password Visibility Toggle Pattern
**Learning:** A "Show/Hide Password" toggle significantly improves UX by allowing users to verify their input. Implementing this in Vue requires a reactive boolean and dynamic `:type` binding. Using a `type="button"` for the toggle is critical to avoid accidental form submission.
**Action:** For all sensitive input fields, provide a visibility toggle with appropriate ARIA labels and ensure the toggle button does not trigger form submission.

## 2026-04-25 - Smooth Feedback Transitions
**Learning:** Using smooth transitions for feedback messages (success/error) prevents jarring UI jumps and improves the overall "polished" feel of the application.
**Action:** Use Vue's `<Transition>` component for all dynamic feedback messages to ensure a cohesive and pleasant user experience.
