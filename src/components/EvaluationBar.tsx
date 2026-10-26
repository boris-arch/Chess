import React from 'react';
import { ChessEngineMoveLine } from '../types/chess';

interface EvaluationBarProps {
  engineLines: ChessEngineMoveLine[];
  orientation: 'white' | 'black';
  isCalculating?: boolean;
}

/**
 * Calculates White's win probability percentage (0 - 100) using the standard chess logistic function:
 * P(win) = 1 / (1 + 10^(-cp / 400))
 * where cp is the centipawn score from White's perspective.
 */
export function calculateWinProbability(scoreCp: number, mate: number | null = null): number {
  if (mate !== null) {
    return mate > 0 ? 100 : 0;
  }
  const prob = 1 / (1 + Math.pow(10, -scoreCp / 400));
  return Math.round(prob * 100);
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  engineLines,
  orientation,
  isCalculating = false,
}) => {
  const topCandidate = engineLines[0];

  const scoreCp = topCandidate?.scoreCp ?? 0;
  const mate = topCandidate?.mate ?? null;

  // Percentage calculation with smooth sigmoid for bar height
  let whitePercent = 50;

  if (mate !== null) {
    whitePercent = mate > 0 ? 98 : 2;
  } else if (scoreCp !== null) {
    const factor = 0.0035;
    const sigmoid = 2 / (1 + Math.exp(-factor * scoreCp)) - 1;
    whitePercent = Math.min(97, Math.max(3, 50 + 50 * sigmoid));
  }

  // When orientation is 'white', bottom is White and top is Black.
  // When orientation is 'black', bottom is Black and top is White.
  const isWhiteOrientation = orientation === 'white';
  const fillPercent = isWhiteOrientation ? whitePercent : 100 - whitePercent;

  let displayText = '0.0';
  if (mate !== null) {
    displayText = `M${Math.abs(mate)}`;
  } else if (scoreCp !== null) {
    const pawns = scoreCp / 100;
    const sign = pawns > 0 ? '+' : '';
    displayText = `${sign}${pawns.toFixed(1)}`;
  }

  // Calculate win probability for both sides
  const whiteWinProb = calculateWinProbability(scoreCp, mate);
  const blackWinProb = 100 - whiteWinProb;

  const favoredSide =
    whiteWinProb > 52 ? 'White' : blackWinProb > 52 ? 'Black' : 'Even';
  const favoredWinProb = Math.max(whiteWinProb, blackWinProb);
  const winProbText = `${favoredWinProb}%`;

  // Top player & bottom player win rates based on board orientation
  const topSideLabel = isWhiteOrientation ? 'B' : 'W';
  const topSideProb = isWhiteOrientation ? blackWinProb : whiteWinProb;
  const topIsLightBg = !isWhiteOrientation;

  const bottomSideLabel = isWhiteOrientation ? 'W' : 'B';
  const bottomSideProb = isWhiteOrientation ? whiteWinProb : blackWinProb;
  const bottomIsLightBg = isWhiteOrientation;

  const topTextClasses = topIsLightBg
    ? 'text-stone-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]'
    : 'text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]';

  const bottomTextClasses = bottomIsLightBg
    ? 'text-stone-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]'
    : 'text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]';

  return (
    <div className="flex flex-col items-center select-none w-9 sm:w-11 md:w-12 h-full max-h-[620px] py-1">
      <div
        className="relative w-full h-full bg-stone-950 rounded-xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col justify-end ring-1 ring-white/5"
        title={`Evaluation: ${displayText} | ${favoredSide === 'Even' ? 'Equal Position (50% - 50%)' : `${favoredSide} Winning (${favoredWinProb}%)`} — White: ${whiteWinProb}%, Black: ${blackWinProb}%`}
        aria-label={`Evaluation: ${displayText}, Win probability: ${winProbText}`}
        data-win-probability={favoredWinProb}
      >
        {/* Background layer (top player) */}
        <div
          className={`w-full absolute inset-0 ${
            isWhiteOrientation
              ? 'bg-gradient-to-b from-stone-950 via-stone-900 to-stone-900'
              : 'bg-gradient-to-b from-stone-100 via-stone-200 to-stone-300'
          }`}
        />

        {/* Foreground liquid fill (bottom player) */}
        <div
          className={`w-full transition-[height] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] absolute bottom-0 shadow-lg ${
            isWhiteOrientation
              ? 'bg-gradient-to-t from-stone-100 via-stone-200 to-stone-300'
              : 'bg-gradient-to-t from-stone-950 via-stone-900 to-stone-900'
          }`}
          style={{ height: `${fillPercent}%` }}
        >
          {/* Glowing neon divider line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        </div>

        {/* Top Side Win Rate Readout */}
        <div
          className={`absolute top-2 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-0.5 ${topTextClasses}`}
        >
          <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none uppercase">
            {topSideLabel} {topSideProb}%
          </span>
          {fillPercent < 50 && (
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none mt-1 px-1 py-0.5 rounded bg-black/25 text-emerald-300 backdrop-blur-[1px]">
              {displayText}
            </span>
          )}
        </div>

        {/* Bottom Side Win Rate & Score Readout */}
        <div
          className={`absolute bottom-2 left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none text-center px-0.5 ${bottomTextClasses}`}
        >
          {fillPercent >= 50 && (
            <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none mb-1 px-1 py-0.5 rounded bg-stone-900/80 text-emerald-400">
              {displayText}
            </span>
          )}
          <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none uppercase">
            {bottomSideLabel} {bottomSideProb}%
          </span>
        </div>

        {/* Computing energy shimmer */}
        {isCalculating && (
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-emerald-400/10 to-transparent pointer-events-none animate-pulse" />
        )}
      </div>
    </div>
  );
};
