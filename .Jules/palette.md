## 2025-03-22 - [LoginForm UX and Accessibility]
**Learning:** Even simple forms can be significantly improved with semantic labels, ARIA associations, and loading states to prevent double submissions and provide feedback. It's crucial to balance these improvements with project constraints such as line limits and avoiding custom CSS when existing utility classes should be used instead.
**Action:** Always use `<label>` with `for` attributes associated with input `id`s for basic accessibility. Implement loading states for all asynchronous actions to improve UX and prevent redundant requests.
