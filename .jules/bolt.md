## 2025-03-09 - Memoizing SVG Pieces
**Learning:** The `engineLines` state updates frequently during engine evaluation, causing the entire `ChessBoard` and all 32 `ChessPiece` SVG components to re-render constantly. SVGs are surprisingly expensive to reconcile.
**Action:** Always wrap heavy SVG components in `React.memo` when they are rendered in a grid or list that updates frequently from parent state changes (like engine ticks).
