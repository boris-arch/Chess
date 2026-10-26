import React from 'react';
import { ChessEngineMoveLine } from '../types/chess';

interface EvaluationBarProps {
  engineLines: ChessEngineMoveLine[];
  orientation: 'white' | 'black';
  isCalculating?: boolean;
}

/**
 * Calculates win probability percentage using the standard chess logistic function:
 * P(win) = 1 / (1 + 10^(-cp / 400))
 * where cp is the centipawn score, mapping advantage smoothly to 0% - 100%.
 */
export function calculateWinProbability(scoreCp: number, mate: number | null = null): number {
  if (mate !== null) {
    return mate > 0 ? 100 : 0;
  }
  // Standard chess logistic function with Elo scale factor 400:
  // Equivalently P(win) = 1 / (1 + exp(-k * cp)) where k = ln(10) / 400 ≈ 0.0057565
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
  // When orientation is 'white', the bottom fill represents White (light).
  // When orientation is 'black', the bottom fill represents Black (dark).
  const isWhiteOrientation = orientation === 'white';
  const fillPercent = isWhiteOrientation ? whitePercent : 100 - whitePercent;

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

  // Calculate win probability using standard logistic function
  const whiteWinProb = calculateWinProbability(scoreCp, mate);
  const blackWinProb = 100 - whiteWinProb;
  // Win probability for the dominant side corresponding to where the badge is placed
  const favoredWinProb = Math.max(whiteWinProb, blackWinProb);
  const winProbText = `${favoredWinProb}%`;

  // Contrast classes depending on whether the badge is over a light or dark background
  // When orientation is white: bottom is white (light), top is black (dark)
  // When orientation is black: bottom is black (dark), top is white (light)
  const isBottomBadge = fillPercent > 50;
  const isBadgeOnLightBg = isWhiteOrientation ? isBottomBadge : !isBottomBadge;

  const badgeThemeClasses = isBadgeOnLightBg
    ? 'text-stone-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]'
    : 'text-stone-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]';

  const badgePositionClass = isBottomBadge ? 'bottom-2' : 'top-2';

  return (
    <div className="flex flex-col items-center select-none w-8 sm:w-9 md:w-10 h-full max-h-[620px] py-1">
      <div
        className="relative w-full h-full bg-stone-950 rounded-xl overflow-hidden border border-stone-800 shadow-2xl flex flex-col justify-end ring-1 ring-white/5"
        title={`Evaluation: ${displayText} | Win Probability: ${winProbText} (White: ${whiteWinProb}%, Black: ${blackWinProb}%)`}
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

        {/* Readout badge with evaluation score and win probability percentage */}
        <div
          className={`absolute left-0 right-0 z-20 flex flex-col items-center justify-center pointer-events-none transition-all duration-300 text-center px-0.5 ${badgePositionClass} ${badgeThemeClasses}`}
        >
          <span className="text-[10px] sm:text-[11px] md:text-xs font-black tracking-tight leading-none">
            {displayText}
          </span>
          <span
            className="text-[8px] sm:text-[9px] md:text-[10px] font-bold tracking-tight opacity-95 leading-none mt-1 font-mono"
            title={`Win Probability: ${winProbText}`}
          >
            {winProbText}
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
