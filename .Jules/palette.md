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
