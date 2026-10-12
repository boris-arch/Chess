import React from 'react';
import { ChessEngineMoveLine } from '../types/chess';

interface EvaluationBarProps {
  engineLines: ChessEngineMoveLine[];
  orientation: 'white' | 'black';
  isCalculating?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  engineLines,
  orientation,
  isCalculating = false,
}) => {
  const topCandidate = engineLines[0];

  const scoreCp = topCandidate?.scoreCp ?? 0;
  const mate = topCandidate?.mate ?? null;

  // Percentage calculation with smooth sigmoid
  let whitePercent = 50;

  if (mate !== null) {
    whitePercent = mate > 0 ? 98 : 2;
  } else if (scoreCp !== null) {
    const factor = 0.0035;
    const sigmoid = 2 / (1 + Math.exp(-factor * scoreCp)) - 1;
    whitePercent = Math.min(97, Math.max(3, 50 + 50 * sigmoid));
  }

  // Display based on perspective
  const fillPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  let displayText = '0.0';
  let isWhiteAdvantage = false;

  if (mate !== null) {
    displayText = `M${Math.abs(mate)}`;
    isWhiteAdvantage = mate > 0;
  } else if (scoreCp !== null) {
    const pawns = scoreCp / 100;
    const sign = pawns > 0 ? '+' : '';
    displayText = `${sign}${pawns.toFixed(1)}`;
    isWhiteAdvantage = scoreCp > 0;
  }

  return (
    <div className="flex flex-col items-center select-none w-7 md:w-8.5 h-full max-h-[620px] py-1">
      <div
        className="relative w-full h-full bg-stone-950 rounded-xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col justify-end ring-1 ring-white/5"
        title={`Evaluation: ${displayText}`}
      >
        {/* Black side fill (top) */}
        <div className="w-full bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900 absolute inset-0" />

        {/* White side fill (bottom) with liquid transition */}
        <div
          className="w-full bg-gradient-to-t from-stone-100 via-stone-200 to-stone-300 transition-[height] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] absolute bottom-0 shadow-lg"
          style={{ height: `${fillPercent}%` }}
        >
          {/* Glowing neon divider line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </div>

        {/* Readout badge with subtle glassmorphic backdrop */}
        <div
          className={`absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none transition-all duration-300 text-[10px] md:text-xs font-black tracking-tight ${
            fillPercent > 50
              ? 'bottom-2 text-stone-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
              : 'top-2 text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
          }`}
        >
          {displayText}
        </div>

        {/* Computing energy shimmer */}
        {isCalculating && (
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-emerald-400/10 to-transparent pointer-events-none animate-pulse" />
        )}
      </div>
    </div>
  );
};
