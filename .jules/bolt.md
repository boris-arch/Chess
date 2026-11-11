## 2025-02-24 - Expensive Chess.js Board Operations during High-Frequency React Engine Re-renders
**Learning:** High-frequency state updates like `engineLines` trigger intense re-rendering. During these renders, non-memoized calls to `chess.js` functions like `game.moves()` and iterations over `game.board()` result in excessive CPU load.
**Action:** Always memoize derived state that depends on `game` (or string matches against histories/openings databases) with `useMemo` to ensure they only recalculate when strictly necessary, rather than on every frame.
