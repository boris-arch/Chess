import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess, Square as ChessSquare, Move } from 'chess.js';
import { ChessPiece } from './ChessPieces';
import { BoardTheme, ChessEngineMoveLine, Square } from '../../types/chess';

interface ChessBoardProps {
  game: Chess;
  orientation: 'white' | 'black';
  theme: BoardTheme;
  engineLines: ChessEngineMoveLine[];
  showArrows: boolean;
  lastMove: { from: Square; to: Square } | null;
  onMove: (from: Square, to: Square, promotion?: string) => boolean;
  disabled?: boolean;
  hoveredMoveUci?: string | null;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const THEME_STYLES: Record<
  BoardTheme,
  {
    light: string;
    dark: string;
    lightLabel: string;
    darkLabel: string;
  }
> = {
  emerald: {
    light: '#ebecd0',
    dark: '#739552',
    lightLabel: '#739552',
    darkLabel: '#ebecd0',
  },
  classic: {
    light: '#f0d9b5',
    dark: '#b58863',
    lightLabel: '#b58863',
    darkLabel: '#f0d9b5',
  },
  wood: {
    light: '#deb887',
    dark: '#8b4513',
    lightLabel: '#8b4513',
    darkLabel: '#deb887',
  },
  midnight: {
    light: '#94a3b8',
    dark: '#334155',
    lightLabel: '#334155',
    darkLabel: '#94a3b8',
  },
  ocean: {
    light: '#dbeafe',
    dark: '#3b82f6',
    lightLabel: '#3b82f6',
    darkLabel: '#dbeafe',
  },
};

export const ChessBoard: React.FC<ChessBoardProps> = ({
  game,
  orientation,
  theme,
  engineLines,
  showArrows,
  lastMove,
  onMove,
  disabled = false,
  hoveredMoveUci = null,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Drag state
  const [draggingSquare, setDraggingSquare] = useState<Square | null>(null);
  const [hoveredDropSquare, setHoveredDropSquare] = useState<Square | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const floatingPieceRef = useRef<HTMLDivElement>(null);
  const draggingSquareRef = useRef<Square | null>(null);
  const hoveredSquareRef = useRef<Square | null>(null);
  draggingSquareRef.current = draggingSquare;

  // Board orientation
  const displayFiles = orientation === 'white' ? FILES : [...FILES].reverse();
  const displayRanks = orientation === 'white' ? RANKS : [...RANKS].reverse();

  // Legal moves for selected square (memoized directly from current game)
  const legalMovesForSelected = selectedSquare
    ? game.moves({ square: selectedSquare as ChessSquare, verbose: true })
    : [];
  const legalTargetSquares = new Set(legalMovesForSelected.map((m) => m.to));

  // Determine king in check square
  let checkKingSquare: Square | null = null;
  if (game.inCheck()) {
    const turnColor = game.turn();
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        const piece = board[r][f];
        if (piece && piece.type === 'k' && piece.color === turnColor) {
          const fileChar = String.fromCharCode(97 + f);
          const rankChar = String(8 - r);
          checkKingSquare = `${fileChar}${rankChar}` as Square;
          break;
        }
      }
      if (checkKingSquare) break;
    }
  }

  // Convert client coordinates (x, y) to chess square
  const getSquareFromCoords = useCallback(
    (clientX: number, clientY: number): Square | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

      const col = Math.floor((x / rect.width) * 8);
      const row = Math.floor((y / rect.height) * 8);

      if (col < 0 || col >= 8 || row < 0 || row >= 8) return null;

      const file = displayFiles[col];
      const rank = displayRanks[row];
      return `${file}${rank}` as Square;
    },
    [displayFiles, displayRanks]
  );

  // Attempt move execution
  const executeMove = useCallback(
    (from: Square, to: Square) => {
      const piece = game.get(from as ChessSquare);
      const isPawn = piece && piece.type === 'p';
      const isWhitePromo = isPawn && piece.color === 'w' && to.endsWith('8');
      const isBlackPromo = isPawn && piece.color === 'b' && to.endsWith('1');

      if (isWhitePromo || isBlackPromo) {
        setPendingPromotion({ from, to });
        return;
      }

      const success = onMove(from, to);
      if (success) {
        setSelectedSquare(null);
      }
    },
    [game, onMove]
  );

  // Handle click on square (Click-to-Move)
  const handleSquareClick = (square: Square) => {
    if (disabled || pendingPromotion) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        // Deselect on re-click
        setSelectedSquare(null);
        return;
      }

      // Check if clicked square is a legal destination
      const moves = game.moves({ square: selectedSquare as ChessSquare, verbose: true });
      const isLegal = moves.some((m) => m.to === square);

      if (isLegal) {
        executeMove(selectedSquare, square);
        return;
      }

      // If clicked another friendly piece, switch selection
      const clickedPiece = game.get(square as ChessSquare);
      if (clickedPiece && clickedPiece.color === game.turn()) {
        setSelectedSquare(square);
        return;
      }

      // Clicked elsewhere - deselect
      setSelectedSquare(null);
    } else {
      // Select piece if it's the current player's piece
      const piece = game.get(square as ChessSquare);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
    }
  };

  // Pointer Down (Drag start or Click start)
  const handlePointerDown = (e: React.PointerEvent, square: Square) => {
    if (disabled || pendingPromotion) return;

    const piece = game.get(square as ChessSquare);

    // If already selected another piece and tapping on a legal target square
    if (selectedSquare && selectedSquare !== square) {
      const moves = game.moves({ square: selectedSquare as ChessSquare, verbose: true });
      const isLegal = moves.some((m) => m.to === square);
      if (isLegal) {
        executeMove(selectedSquare, square);
        return;
      }
    }

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      setDraggingSquare(square);
      if (floatingPieceRef.current) {
        floatingPieceRef.current.style.transform = `translate3d(${e.clientX - 32}px, ${e.clientY - 32}px, 0)`;
      }
    }
  };

  // Global pointer move and up listeners for fluid dragging without pointer capture issues
  useEffect(() => {
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!draggingSquareRef.current) return;
      if (floatingPieceRef.current) {
        floatingPieceRef.current.style.transform = `translate3d(${e.clientX - 32}px, ${e.clientY - 32}px, 0)`;
      }

      const hoverSq = getSquareFromCoords(e.clientX, e.clientY);
      if (hoverSq !== hoveredSquareRef.current) {
        hoveredSquareRef.current = hoverSq;
        setHoveredDropSquare(hoverSq);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      const currentDrag = draggingSquareRef.current;
      if (!currentDrag) return;

      const dropSq = getSquareFromCoords(e.clientX, e.clientY);

      setDraggingSquare(null);
      setHoveredDropSquare(null);
      hoveredSquareRef.current = null;

      if (dropSq && dropSq !== currentDrag) {
        const moves = game.moves({ square: currentDrag as ChessSquare, verbose: true });
        const isLegal = moves.some((m) => m.to === dropSq);
        if (isLegal) {
          executeMove(currentDrag, dropSq);
        }
      }
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [game, executeMove, getSquareFromCoords]);

  const handlePromotionSelect = (promoPiece: 'q' | 'r' | 'b' | 'n') => {
    if (!pendingPromotion) return;
    onMove(pendingPromotion.from, pendingPromotion.to, promoPiece);
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  const squareToCoords = (sq: Square): { col: number; row: number } => {
    const file = sq[0];
    const rank = sq[1];
    const col = displayFiles.indexOf(file);
    const row = displayRanks.indexOf(rank);
    return { col, row };
  };

  const themeStyle = THEME_STYLES[theme] || THEME_STYLES.emerald;
  const draggedPiece = draggingSquare ? game.get(draggingSquare as ChessSquare) : null;

  const ARROW_COLORS = [
    { stroke: '#10b981', fill: '#10b981', glow: 'rgba(16, 185, 129, 0.45)', markerId: 'arr-em' },
    { stroke: '#06b6d4', fill: '#06b6d4', glow: 'rgba(6, 182, 212, 0.45)', markerId: 'arr-cy' },
    { stroke: '#f59e0b', fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)', markerId: 'arr-am' },
  ];

  return (
    <div className="relative select-none w-full max-w-[620px] mx-auto aspect-square p-2 bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 rounded-2xl shadow-2xl border border-stone-800">
      {/* Board container */}
      <div
        ref={boardRef}
        style={{ touchAction: 'none' }}
        className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-xl overflow-hidden relative shadow-inner cursor-pointer"
      >
        {displayRanks.map((rank, rankIdx) =>
          displayFiles.map((file, fileIdx) => {
            const square = `${file}${rank}` as Square;
            const isLight = (fileIdx + rankIdx) % 2 === 0;
            const piece = game.get(square as ChessSquare);

            const isSelected = selectedSquare === square;
            const isLegalTarget = legalTargetSquares.has(square);
            const isHoveredTarget = hoveredDropSquare === square && isLegalTarget;
            const isLastMoveFrom = lastMove?.from === square;
            const isLastMoveTo = lastMove?.to === square;
            const isInCheck = checkKingSquare === square;
            const isCurrentlyDraggingThis = draggingSquare === square;

            const isHoveredLineFrom = hoveredMoveUci?.startsWith(square);
            const isHoveredLineTo = hoveredMoveUci?.endsWith(square);

            const showRankCoord = fileIdx === 0;
            const showFileCoord = rankIdx === 7;

            return (
              <div
                key={square}
                onClick={() => handleSquareClick(square)}
                onPointerDown={(e) => handlePointerDown(e, square)}
                style={{
                  backgroundColor: isLight ? themeStyle.light : themeStyle.dark,
                }}
                className={`relative flex items-center justify-center select-none transition-all duration-75 ${
                  isSelected ? 'ring-3 ring-inset ring-amber-400 z-10' : ''
                } ${
                  isLastMoveFrom || isLastMoveTo
                    ? 'after:absolute after:inset-0 after:bg-amber-400/25 after:pointer-events-none'
                    : ''
                } ${
                  isHoveredLineFrom || isHoveredLineTo
                    ? 'ring-2 ring-inset ring-emerald-400 after:absolute after:inset-0 after:bg-emerald-400/20'
                    : ''
                } ${isHoveredTarget ? 'brightness-110 scale-[0.98]' : ''}`}
                data-square={square}
              >
                {/* King in Check Pulsating Alert */}
                {isInCheck && (
                  <div className="absolute inset-0 bg-red-600/50 animate-pulse rounded-md pointer-events-none z-10" />
                )}

                {/* Coordinate labels */}
                {showRankCoord && (
                  <span
                    style={{
                      color: isLight ? themeStyle.lightLabel : themeStyle.darkLabel,
                    }}
                    className="absolute top-1 left-1.5 text-[10px] md:text-xs font-black leading-none pointer-events-none select-none opacity-85"
                  >
                    {rank}
                  </span>
                )}

                {showFileCoord && (
                  <span
                    style={{
                      color: isLight ? themeStyle.lightLabel : themeStyle.darkLabel,
                    }}
                    className="absolute bottom-1 right-1.5 text-[10px] md:text-xs font-black leading-none pointer-events-none select-none opacity-85"
                  >
                    {file}
                  </span>
                )}

                {/* Legal move indicators */}
                {isLegalTarget && !piece && (
                  <div
                    className={`absolute w-3.5 h-3.5 md:w-5 md:h-5 rounded-full pointer-events-none z-10 transition-transform ${
                      isHoveredTarget
                        ? 'scale-125 bg-stone-900/60 ring-2 ring-amber-400'
                        : 'bg-stone-900/25'
                    }`}
                  />
                )}
                {isLegalTarget && piece && (
                  <div
                    className={`absolute inset-1.5 rounded-full border-4 pointer-events-none z-10 transition-all ${
                      isHoveredTarget
                        ? 'border-red-500 scale-105 bg-red-500/15'
                        : 'border-stone-900/35'
                    }`}
                  />
                )}

                {/* Piece Rendering */}
                {piece && (
                  <div
                    className={`w-[88%] h-[88%] flex items-center justify-center transition-all duration-75 z-20 drop-shadow-md pointer-events-none ${
                      isCurrentlyDraggingThis ? 'opacity-20 scale-90' : 'hover:scale-105'
                    }`}
                  >
                    <ChessPiece color={piece.color} type={piece.type} />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Engine Recommendation Arrows Overlay */}
        {showArrows && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
            viewBox="0 0 800 800"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          >
            <defs>
              {ARROW_COLORS.map((arrowCol) => (
                <marker
                  key={arrowCol.markerId}
                  id={arrowCol.markerId}
                  markerWidth="7"
                  markerHeight="7"
                  refX="5"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 3.5, 0 7" fill={arrowCol.fill} />
                </marker>
              ))}
            </defs>

            {engineLines.slice(0, 3).map((line, idx) => {
              if (!line.fromSquare || !line.toSquare || line.fromSquare === line.toSquare) return null;

              const isLineHovered = hoveredMoveUci === line.bestMoveUci;
              const from = squareToCoords(line.fromSquare);
              const to = squareToCoords(line.toSquare);

              if (from.col < 0 || from.row < 0 || to.col < 0 || to.row < 0) return null;

              const x1 = from.col * 100 + 50;
              const y1 = from.row * 100 + 50;
              const x2 = to.col * 100 + 50;
              const y2 = to.row * 100 + 50;

              const dx = x2 - x1;
              const dy = y2 - y1;
              const length = Math.sqrt(dx * dx + dy * dy);
              if (length === 0) return null;

              const shorten = 26;
              const finalX2 = x2 - (dx / length) * shorten;
              const finalY2 = y2 - (dy / length) * shorten;

              const strokeWidth = isLineHovered ? 16 : idx === 0 ? 13 : idx === 1 ? 10 : 8;
              const opacity = isLineHovered ? 1.0 : idx === 0 ? 0.9 : idx === 1 ? 0.75 : 0.65;
              const arrowCol = ARROW_COLORS[idx] || ARROW_COLORS[0];

              return (
                <g key={`arrow-${line.id}-${idx}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={finalX2}
                    y2={finalY2}
                    stroke={arrowCol.glow}
                    strokeWidth={strokeWidth + 6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={x1}
                    y1={y1}
                    x2={finalX2}
                    y2={finalY2}
                    stroke={arrowCol.stroke}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeOpacity={opacity}
                    markerEnd={`url(#${arrowCol.markerId})`}
                  />
                  <circle
                    cx={x1}
                    cy={y1}
                    r={strokeWidth * 0.85}
                    fill={arrowCol.fill}
                    fillOpacity={opacity}
                  />
                  {idx === 0 && (
                    <circle
                      cx={x2}
                      cy={y2}
                      r="30"
                      fill="none"
                      stroke={arrowCol.stroke}
                      strokeWidth="2.5"
                      strokeDasharray="4 4"
                      strokeOpacity="0.75"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Promotion Modal */}
        {pendingPromotion && (
          <div className="absolute inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl p-4 shadow-2xl text-center max-w-xs animate-in zoom-in-95">
              <h3 className="text-white font-bold mb-3 text-sm">Promote Pawn</h3>
              <div className="grid grid-cols-4 gap-2">
                {(['q', 'r', 'b', 'n'] as const).map((pieceType) => {
                  const promoColor = game.turn();
                  const label =
                    pieceType === 'q'
                      ? 'Queen'
                      : pieceType === 'r'
                      ? 'Rook'
                      : pieceType === 'b'
                      ? 'Bishop'
                      : 'Knight';

                  return (
                    <button
                      key={pieceType}
                      onClick={() => handlePromotionSelect(pieceType)}
                      className="flex flex-col items-center justify-center p-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 hover:border-emerald-500 rounded-xl cursor-pointer transition-all hover:scale-105"
                    >
                      <div className="w-10 h-10 mb-1">
                        <ChessPiece color={promoColor} type={pieceType} />
                      </div>
                      <span className="text-[11px] text-stone-300 font-semibold">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Dragged Piece Cursor Follower */}
      {draggingSquare && draggedPiece && (
        <div
          ref={floatingPieceRef}
          className="fixed pointer-events-none z-50 w-16 h-16 top-0 left-0 flex items-center justify-center filter drop-shadow-2xl scale-110 will-change-transform"
        >
          <ChessPiece color={draggedPiece.color} type={draggedPiece.type} />
        </div>
      )}
    </div>
  );
};
