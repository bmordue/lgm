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

## 2026-04-04 - Persistent Reactive Session Management
**Learning:** Initializing Pinia state from `localStorage` on store creation, combined with a dedicated logout action, provides a more reliable and reactive authentication state than manual `localStorage` checks in individual methods. This allows for clean, conditional UI rendering and navigation guards.
**Action:** Always prefer reactive state for session management and initialize from persistent storage at the earliest possible point.
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

## 2026-05-20 - Multi-modal Tactical Unit Differentiation
**Learning:** In complex tactical maps, using a combination of distinct stroke colors (e.g., brand-green for own, orange for enemy) and subtle corresponding fills (0.1 opacity) significantly improves unit discoverability and ownership identification. Ensuring these same visual patterns are mirrored in a persistent Map Legend reduces cognitive load for new users.
**Action:** Always pair tactical stroke highlights with a subtle color-matched fill on maps, and ensure every visual state has a corresponding entry in the Map Legend.

## 2026-04-24 - Password Visibility Toggle Pattern
**Learning:** A "Show/Hide Password" toggle significantly improves UX by allowing users to verify their input. Implementing this in Vue requires a reactive boolean and dynamic `:type` binding. Using a `type="button"` for the toggle is critical to avoid accidental form submission.
**Action:** For all sensitive input fields, provide a visibility toggle with appropriate ARIA labels and ensure the toggle button does not trigger form submission.

## 2026-04-25 - Smooth Feedback Transitions
**Learning:** Using smooth transitions for feedback messages (success/error) prevents jarring UI jumps and improves the overall "polished" feel of the application.
**Action:** Use Vue's `<Transition>` component for all dynamic feedback messages to ensure a cohesive and pleasant user experience.

## 2026-04-27 - Standardized Brand-Aligned Focus Pattern
**Learning:** Inconsistent focus indicators (or their absence via `outline: none`) significantly hinder keyboard accessibility. Implementing a standardized, brand-aligned `:focus-visible` pattern (using `hsla(160, 100%, 37%, 1)`) across all interactive elements (buttons, list items, SVG groups) ensures a clear, predictable, and professional experience for keyboard users without cluttering the UI for mouse users.
**Action:** Always replace `outline: none` on interactive elements with a `:focus-visible` brand-green outline and appropriate offset (e.g., 2px-4px) to ensure multi-modal accessibility.

## 2026-05-21 - Synchronized Spatial-Textual Selection and Scrolling
**Learning:** When a user selects an entity in a spatial view (like a map), automatically scrolling the corresponding item into view in a textual list (sidebar) drastically reduces cognitive load. It ensures that the detailed information the user is seeking remains visible even in long lists.
**Action:** Implement a watcher on selection state that calls `scrollIntoView` with `behavior: 'smooth'` and `block: 'nearest'` on the target list item.

## 2026-05-21 - Visual Affordance for Active Selection
**Learning:** A static highlight for a selected item can sometimes get lost in complex tactical maps. A subtle pulsing animation on the selection border adds a layer of "delight" while making the active entity immediately identifiable.
**Action:** Use a `@keyframes` animation to subtly cycle the `stroke-width` of the selected entity's highlight.

## 2026-05-21 - Accessible Map Legend Pattern
**Learning:** In Map Legends where color swatches are purely decorative and accompanied by text labels, marking the swatches with `aria-hidden="true"` reduces screen reader noise. Sighted users get the visual link, while screen reader users get the clear, uncluttered information.
**Action:** Always apply `aria-hidden="true"` to decorative color/icon swatches in legends and lists.

## 2026-04-29 - Logic-Aware UI Feedback Positioning
**Learning:** Success messages and other high-priority feedback should be positioned at the top of the viewport or container to remain visible regardless of list length or scroll position. Shared layout styling between success and error messages improves visual consistency and code maintainability.
**Action:** Always place global feedback messages at the top of the page/container and use a shared CSS base for all status alerts.

## 2026-05-28 - Semantic Icons and Interactive Affordance
**Learning:** Adding semantic icons (like check-circles for success and alert-circles for errors) significantly improves the speed at which users process feedback messages. Similarly, adding chevrons with hover-driven animations to list items provides a clear "interactive" affordance that plain borders cannot.
**Action:** Always pair status messages with semantic icons and use animated chevrons for primary interactive list elements to improve clarity and delight.

## 2026-05-01 - Synchronized Spatial-Textual Cross-Highlighting
**Learning:** When users hover over an action (like a planned move) in a list, synchronizing the highlight of the associated entity (the actor) both in the list and on the map provides immediate and clear context. This further strengthens the correlation between spatial and textual data.
**Action:** Ensure that hovering over a planned action updates the hover state of the associated entity (e.g., setting 'hoveredActorId' when hovering a move) to provide comprehensive visual feedback across the UI.

## 2026-05-03 - Manual Refresh Pattern for Dynamic Dashboards
**Learning:** Providing a manual refresh button for dynamic lists (like a games dashboard) empowers users to check for updates without a full page reload. Combining this with an inline spinning icon provides immediate visual feedback that the request is in progress, satisfying the need for both control and status visibility.
**Action:** Always include a manual refresh button for dynamic data lists, using an inline SVG with a spinning animation during the loading state and proper ARIA labels.

## 2026-05-04 - Section Counts and Status Indicators
**Learning:** Using parenthetical counts in section headings (e.g., 'Actors (9)', 'Planned Moves (1)') and appending a '(Planned)' text indicator to entity names in sidebars provides at-a-glance status updates. This reduces cognitive load by summarizing list state and highlighting active planning without requiring full list scanning.
**Action:** Always include item counts in headings for primary lists and use explicit textual indicators for active states to supplement visual cues.

## 2026-06-01 - Animated Spatial Feedback and SVG Test Robustness
**Learning:** Visualizing planned actions (like moves) using animated "marching ants" lines (`stroke-dashoffset`) with directional markers significantly improves tactical clarity. When testing SVG-heavy components, using generic tag selectors (like `polygon`) is brittle if decorators (like markers) use the same tags; specific class-based selectors are essential for robust tests.
**Action:** Always use specific CSS classes for functional SVG elements in unit tests to avoid collisions with decorative or definition elements.

## 2026-05-06 - Standardized Manual Refresh and Async State Management
**Learning:** Manual refresh buttons should follow a consistent visual pattern (inline spinning SVG, brand-aligned styling) and always manage their loading state within a `try...finally` block. This ensures the UI remains interactive and accurate even if the network request fails, preventing "stuck" loading indicators.
**Action:** Always wrap async state toggles in `try...finally` and reuse the established `.refresh-btn` and `.spinning` CSS patterns for consistency.

## 2026-05-08 - Standardized Async Feedback Pattern
**Learning:** Centralizing loading animations (e.g., `.spinning`) and spinner styles (e.g., `.btn-spinner`) in a global stylesheet ensures a consistent user experience across the application. Using `aria-busy="true"` on buttons alongside visual spinners provides both visual and semantic feedback for long-running operations.
**Action:** Always use the global `.btn-spinner` and `.spinning` classes for asynchronous action buttons, and ensure `aria-busy` and `aria-live` are set on the parent interactive element.

## 2026-05-10 - Dynamic Grid Contrast and Selection Patterns
**Learning:** In spatial grids with varying terrain, coordinate text must dynamically adjust its color to maintain contrast (e.g., using a light color on dark 'Unexplored' or 'Blocked' hexes). Additionally, interactive selection should always be toggleable (click-to-select, click-again-to-deselect) to provide an intuitive and forgiving user experience.
**Action:** Implement conditional 'dark-terrain' classes for grid entities and ensure all selection logic supports explicit deselection via re-clicking the active item.

## 2026-05-12 - Bi-directional Selection Synchronization
**Learning:** For complex game views, synchronizing the selection state between a spatial map and a textual list (sidebar) significantly improves usability. Lifting the selection state to the parent component allows it to act as a single source of truth, enabling users to switch between units from either view seamlessly.
**Action:** Always lift selection state to the nearest common ancestor when multiple views (e.g., map and sidebar) need to reflect the same interactive state.

## 2026-05-12 - Discoverability via Legends and Keyboard Shortcuts
**Learning:** Spatial grids with complex state (various terrain, unit ownership, selection status) suffer from "hidden knowledge" where visual cues are not immediately intuitive. Providing a visual legend alongside global keyboard shortcuts (like 'Escape' for deselection) drastically lowers the barrier to entry and makes the interface feel more professional and responsive.
**Action:** Always include a visual legend for complex spatial grids and implement standard keyboard shortcuts (Escape, Enter, Arrows) to manage selection and navigation states.

## 2026-05-08 - Copy to Clipboard Pattern with Feedback
**Learning:** Implementing a "Copy to Clipboard" feature requires both visual (icon change) and semantic (ARIA role="status") feedback to ensure all users are aware of the success. Using a temporary reactive state with a timeout and CSS animations provides a smooth, non-disruptive confirmation.
**Action:** Always pair clipboard actions with a brief success state (e.g., 2 seconds) that updates the button's icon/label and provides a visible feedback message.

## 2026-05-08 - Defensive Rendering for Async Data
**Learning:** Guarding template sections that rely on async data with `v-if` prevent "flash of undefined content" (FOUC) where placeholders like "Game #undefined" are briefly visible. Setting a `min-height` on the container helps stabilize the layout during transitions.
**Action:** Use explicit null/undefined checks for primary data IDs before rendering headers or metadata sections, and use CSS to preserve layout space.

## 2026-05-15 - Global Authentication Synchronization Pattern
**Learning:** In applications where identity is managed by an upstream proxy, explicitly synchronizing the frontend authentication state during the root component's `onMounted` lifecycle ensures a consistent experience across all routes. Displaying a personalized greeting immediately upon verification provides clear confirmation of identity and builds trust.
**Action:** Always call identity synchronization methods in the root `App.vue` mount and provide visual feedback of the authenticated state in the global header.

## 2026-05-14 - In-place Confirmation for Destructive Batch Actions
**Learning:** For batch-destructive actions like "Clear All", an in-place confirmation flow (replacing the button with Confirm/Cancel options) provides a safe safeguard without the jarring interruption of a browser `window.confirm()`. Focus management (shifting focus to the "Confirm" button) is essential for keyboard accessibility in this pattern.
**Action:** Implement in-place confirmation for batch actions and use `nextTick` to ensure the new interactive element receives focus immediately.

## 2026-05-15 - Standardized Tactile Feedback and Non-Shifting Hover States
**Learning:** Standardizing click feedback using `:active { transform: scale(0.98); }` across all interactive elements (buttons, list items, navigation links) creates a much more tactile and responsive feel. Additionally, using a colored left border (initially transparent) for hover highlights instead of changing padding prevents jarring text shifts, maintaining visual stability during interaction.
**Action:** Always apply the standard scale-down transform for active states and prefer border-based highlights over padding changes for list item hover states.

## 2026-05-16 - Unified Spatial-Textual Coordinate and Selection Pattern
**Learning:** In applications with both spatial (map) and textual (list) views, ensuring parity in coordinate display (e.g., matching the map's (row, col) text with the sidebar's labels) and selection styling (e.g., using the same red #c0392b highlight for both) drastically reduces cognitive load. Users can intuitively correlate entities between different modalities without mental translation.
**Action:** Always unify coordinate formatting and interactive styling (colors, offsets) between map and sidebar components to strengthen the mental model of a single, synchronized state.

## 2026-05-18 - Explicit Null Checks for Numeric IDs
**Learning:** In Vue templates, using `v-if="id"` is dangerous if `id` can be `0`, as it will be treated as falsy. This leads to broken UI states where the first item in a list (often ID 0) doesn't trigger the expected conditional rendering.
**Action:** Always use explicit null/undefined checks (e.g., `v-if="id !== null"`) when dealing with numeric IDs in conditional logic.

## 2026-05-23 - Data Freshness Transparency via 'Last Refreshed' Indicators
**Learning:** Providing a 'Last Refreshed' timestamp next to manual refresh actions or in dynamic game status bars significantly increases user confidence in the displayed data. Using a consistent brand-aligned icon (like the green clock) and right-aligning it in status bars (via `margin-left: auto`) creates a balanced and professional layout.
**Action:** Always include a 'Last Refreshed' timestamp (formatted via `toLocaleTimeString()`) for views with dynamic or frequently changing data, and synchronize its update with both manual refreshes and automatic state updates (like form submissions).

## 2026-05-18 - "Tactical Insight" Inspection Pattern
**Learning:** In tactical interfaces, users instinctively want to "select" all entities to gather information. Restricting selection only to owned units feels broken and frustrating. Allowing universal selection while clearly labeling non-owned units as "Tactical Insight" provides a satisfying information-gathering experience without confusing the user about their available actions.
**Action:** Implement universal selection for all entities on a map, but use distinct visual themes (e.g., orange for enemy, green for own) and clear instructional text to differentiate between informative and actionable selections.

## 2026-05-25 - Ubiquitous Tactile Feedback for Core Navigation
**Learning:** Extending the project-standard tactile feedback pattern (transform: scale(0.98) on :active) to the root layout's navigation and branding elements creates a sense of holistic polish. It reinforces the application's interactive personality from the moment the user first engages with the logo or primary links.
**Action:** When implementing tactile feedback, always ensure it is applied consistently across all primary interactive containers, including global headers and branding, to avoid "dead zones" where the UI feels unexpectedly static.

## 2026-05-26 - Structured Information Cards for Tactical Entities
**Learning:** Replacing plain-text lists of game entities (like actors) with structured cards that use visual cues (health bars, status tags) and distinct headers significantly improves the scannability of the game state. Pairing these visual cues with descriptive `aria-label` ensures that the improved experience remains accessible to screen reader users.
**Action:** Always prefer structured, semantic containers over flat text for entity lists, and use visual indicators (like color-coded bars) to represent critical numeric data like health.

## 2026-05-26 - Context-Aware Personalization in Multi-player Views
**Learning:** Using the authenticated user's actual name in player lists and unit markers, rather than generic placeholders like "Player [ID]", creates a stronger sense of ownership and presence. This reduces the mental distance between the user and their in-game persona.
**Action:** Always synchronize the frontend's user identity store with game-specific player lists to provide personalized "You" markers.

## 2026-05-26 - Responsive Spatial and Tactical Layouts
**Learning:** Tactical games often rely on a sidebar-and-map layout which fails on narrow viewports. Implementing a responsive shift to a vertical stack (`flex-direction: column`) with strategic re-ordering (e.g., placing the map above the unit list) ensures the core spatial experience remains primary even on mobile devices.
**Action:** For all spatial/tactical layouts, implement a breakpoint-based vertical stack that prioritizes the map/grid view while keeping interactive list controls accessible below.

## 2026-05-27 - Interactive Legend Highlighting Pattern
**Learning:** Making a static Map Legend interactive by using hover/focus states to trigger spatial highlights on a grid drastically improves the discoverability and clarity of complex visual states. Using `tabindex="0"` and `focusin`/`focusout` ensures this "delightful" feature is also accessible to keyboard users.
**Action:** Always implement cross-highlighting between legends and their associated spatial representations to strengthen the mental link between abstract categories and their concrete instances.

## 2026-06-03 - [Keyboard Shortcut Visibility]
**Learning:** Standardizing keyboard shortcut hints using the `<kbd>` tag significantly improves discoverability and provides a professional, tactile feel to the UI that users find more intuitive than plain text hints.
**Action:** Always wrap keyboard shortcut hints (like Esc, Ctrl, Enter) in `<kbd>` tags and provide global styling for them.
