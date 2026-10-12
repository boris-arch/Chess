import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Check } from 'lucide-react';
import { MoveRecord, PieceColor, PieceSymbol } from '../types/chess';
import { ChessPiece } from './ChessBoard/ChessPieces';

interface MoveHistoryProps {
  moves: MoveRecord[];
  currentMoveIndex: number; // -1 for start of game
  onSelectMove: (index: number) => void;
  onFirstMove: () => void;
  onPrevMove: () => void;
  onNextMove: () => void;
  onLastMove: () => void;
  capturedWhite: PieceSymbol[]; // Pieces captured by White
  capturedBlack: PieceSymbol[]; // Pieces captured by Black
  fen: string;
}

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  onFirstMove,
  onPrevMove,
  onNextMove,
  onLastMove,
  capturedWhite,
  capturedBlack,
  fen,
}) => {
  const [copiedFen, setCopiedFen] = React.useState(false);

  // Group moves into pairs (White move, Black move)
  const pairedMoves: { moveNumber: number; white?: MoveRecord; whiteIdx?: number; black?: MoveRecord; blackIdx?: number }[] = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    pairedMoves.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIdx: i,
      black: moves[i + 1],
      blackIdx: i + 1 < moves.length ? i + 1 : undefined,
    });
  }

  // Calculate material difference
  const whiteMat = capturedWhite.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  const blackMat = capturedBlack.reduce((sum, p) => sum + (PIECE_VALUES[p] || 0), 0);
  const whiteAdvantage = whiteMat - blackMat;

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-xl flex flex-col h-full text-stone-200">
      {/* Captured pieces bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800 text-xs">
        {/* White captures */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span className="text-[11px] font-semibold text-stone-400">Captured:</span>
          <div className="flex items-center -space-x-1 overflow-x-auto max-w-[120px]">
            {capturedWhite.map((piece, i) => (
              <div key={i} className="w-4 h-4 shrink-0">
                <ChessPiece color="b" type={piece} />
              </div>
            ))}
          </div>
          {whiteAdvantage > 0 && (
            <span className="text-[10px] font-bold text-emerald-400">+{whiteAdvantage}</span>
          )}
        </div>

        {/* Black captures */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <div className="flex items-center -space-x-1 overflow-x-auto max-w-[120px]">
            {capturedBlack.map((piece, i) => (
              <div key={i} className="w-4 h-4 shrink-0">
                <ChessPiece color="w" type={piece} />
              </div>
            ))}
          </div>
          {whiteAdvantage < 0 && (
            <span className="text-[10px] font-bold text-emerald-400">+{Math.abs(whiteAdvantage)}</span>
          )}
        </div>
      </div>

      {/* Move list table */}
      <div className="flex-1 overflow-y-auto my-3 min-h-[160px] max-h-[260px] pr-1 space-y-0.5 font-mono text-xs">
        {pairedMoves.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-500 italic text-xs">
            Start playing or make moves on the board
          </div>
        ) : (
          pairedMoves.map((pair) => (
            <div
              key={pair.moveNumber}
              className="grid grid-cols-[38px_1fr_1fr] items-center rounded py-1 px-1.5 hover:bg-stone-800/50 transition-colors"
            >
              <span className="text-stone-500 font-bold">{pair.moveNumber}.</span>

              {/* White move */}
              {pair.white && (
                <button
                  onClick={() => pair.whiteIdx !== undefined && onSelectMove(pair.whiteIdx)}
                  className={`text-left px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    currentMoveIndex === pair.whiteIdx
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  {pair.white.san}
                </button>
              )}

              {/* Black move */}
              {pair.black ? (
                <button
                  onClick={() => pair.blackIdx !== undefined && onSelectMove(pair.blackIdx)}
                  className={`text-left px-2 py-0.5 rounded cursor-pointer transition-colors ${
                    currentMoveIndex === pair.blackIdx
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {pair.black.san}
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-stone-800">
        <div className="flex items-center gap-1">
          <button
            onClick={onFirstMove}
            disabled={currentMoveIndex === -1}
            title="Start of game"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-300 transition-colors cursor-pointer"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onPrevMove}
            disabled={currentMoveIndex === -1}
            title="Previous move"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNextMove}
            disabled={currentMoveIndex >= moves.length - 1}
            title="Next move"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onLastMove}
            disabled={currentMoveIndex >= moves.length - 1}
            title="Latest move"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-300 transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* FEN Quick Copy */}
        <button
          onClick={handleCopyFen}
          title="Copy current position FEN"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs transition-colors cursor-pointer"
        >
          {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="font-mono text-[11px]">{copiedFen ? 'Copied!' : 'Copy FEN'}</span>
        </button>
      </div>
    </div>
  );
};
