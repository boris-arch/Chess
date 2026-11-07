## 2023-10-27 - [Avoid game.fen() in render loops and callbacks]
**Learning:** `game.fen()` in chess.js is an expensive O(N) string generation operation. Calling it multiple times in callbacks (like cloning the board or checking moves) or in the dependency arrays of `useMemo` forces unnecessary computations.
**Action:** Use a pre-existing state variable like `fen` instead of recalculating it with `game.fen()`. Memoize expensive operations like `game.moves()` and `game.board()` loops.
