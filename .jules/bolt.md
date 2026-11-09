## 2026-11-09 - Expensive O(N) string generation on every render
**Learning:** Using `game.fen()` directly in renders or in engine subscriptions causes an expensive O(N) string generation cost on every trigger or render cycle.
**Action:** Use a pre-computed `fen` state variable across the application and track the latest value inside high-frequency closures using a `useRef` (`fenRef`).
