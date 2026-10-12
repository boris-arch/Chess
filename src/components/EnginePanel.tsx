import React from 'react';
import { Play, Pause, RefreshCw, Cpu, Zap, Eye, ChevronRight, Activity } from 'lucide-react';
import { ChessEngineMoveLine, EngineStatus } from '../types/chess';

interface EnginePanelProps {
  engineLines: ChessEngineMoveLine[];
  engineStatus: EngineStatus;
  autoAnalyze: boolean;
  onToggleAutoAnalyze: () => void;
  onRecalculate: () => void;
  onPlayMove: (uci: string) => void;
  depthLimit: number;
  onChangeDepth: (depth: number) => void;
  multiPvCount: number;
  onChangeMultiPv: (count: number) => void;
  showArrows: boolean;
  onToggleArrows: () => void;
  hoveredMoveUci?: string | null;
  onHoverMove?: (uci: string | null) => void;
  selectedEngine?: 'sf16' | 'sf10';
  onSelectEngine?: (engine: 'sf16' | 'sf10') => void;
}

export const EnginePanel: React.FC<EnginePanelProps> = ({
  engineLines,
  engineStatus,
  autoAnalyze,
  onToggleAutoAnalyze,
  onRecalculate,
  onPlayMove,
  depthLimit,
  onChangeDepth,
  multiPvCount,
  onChangeMultiPv,
  showArrows,
  onToggleArrows,
  hoveredMoveUci = null,
  onHoverMove,
  selectedEngine = 'sf16',
  onSelectEngine,
}) => {
  const topCandidate = engineLines[0];

  const formatScore = (line: ChessEngineMoveLine) => {
    if (line.mate !== null) {
      return {
        text: `M${Math.abs(line.mate)}`,
        isWhiteAdvantage: line.mate > 0,
        isMate: true,
      };
    }
    if (line.scoreCp !== null) {
      const pawns = line.scoreCp / 100;
      const sign = pawns > 0 ? '+' : '';
      return {
        text: `${sign}${pawns.toFixed(2)}`,
        isWhiteAdvantage: line.scoreCp > 0,
        isMate: false,
      };
    }
    return { text: '0.00', isWhiteAdvantage: false, isMate: false };
  };

  const getMoveInsight = (line?: ChessEngineMoveLine) => {
    if (!line || !line.bestMoveSan) return 'Engine calculating optimal tactical continuation...';
    const san = line.bestMoveSan;
    if (san.includes('#')) return 'Forced checkmate on the board!';
    if (san.includes('+')) return `${san} delivers check, forcing the enemy king to respond.`;
    if (san.includes('x')) return `${san} captures piece, seizing material initiative.`;
    if (san === 'O-O' || san === 'O-O-O') return `${san} castles king into safety and connects rooks.`;
    if (san.startsWith('N')) return `${san} maneuvers knight toward active outpost, controlling vital center squares.`;
    if (san.startsWith('B')) return `${san} develops bishop on open diagonal with long-range board pressure.`;
    if (san.startsWith('R')) return `${san} seizes open file and coordinates rank pressure.`;
    if (san.startsWith('Q')) return `${san} repositions queen with maximum board mobility.`;
    if (san.length === 2 || san.startsWith('e') || san.startsWith('d'))
      return `${san} stakes central territorial dominance and optimizes pawn harmony.`;
    return `${san} maximizes piece activity and minimizes tactical weaknesses.`;
  };

  // Depth progress percentage
  const depthPercent = Math.min(100, Math.round((engineStatus.depth / depthLimit) * 100));

  return (
    <div className="bg-stone-900/90 backdrop-blur-md border border-stone-800 rounded-2xl p-4.5 shadow-2xl flex flex-col gap-4 text-stone-200">
      {/* Engine Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-stone-800/80 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 font-black">
              <Cpu className="w-5 h-5" />
            </div>
            {engineStatus.isCalculating && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white tracking-wide">
                {engineStatus.engineName}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  engineStatus.isCalculating
                    ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 animate-pulse'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {engineStatus.isCalculating ? 'Computing' : 'Ready'}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-stone-400 mt-0.5 font-mono">
              <span className="text-emerald-400 font-semibold">
                Depth {engineStatus.depth}/{depthLimit}
              </span>
              <span>•</span>
              <span>{Math.round(engineStatus.nodes / 1000)}k nodes</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-stone-300">
                <Activity className="w-3 h-3 text-emerald-400" />
                {Math.round(engineStatus.nps / 1000)} kN/s
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleArrows}
            title={showArrows ? 'Hide move arrows' : 'Show move arrows'}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showArrows
                ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-md shadow-emerald-950/40'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Arrows</span>
          </button>

          <button
            onClick={onToggleAutoAnalyze}
            title={autoAnalyze ? 'Pause auto-calculation' : 'Resume auto-calculation'}
            className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              autoAnalyze
                ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300 shadow-md shadow-emerald-950/40'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            {autoAnalyze ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Auto</span>
          </button>

          <button
            onClick={onRecalculate}
            title="Recalculate now"
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-all cursor-pointer active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${engineStatus.isCalculating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress bar towards target depth */}
      <div className="w-full h-1.5 bg-stone-950 rounded-full overflow-hidden border border-stone-800/60 -mt-2">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-300 rounded-full"
          style={{ width: `${depthPercent}%` }}
        />
      </div>

      {/* Primary Best Move Highlight Card */}
      {topCandidate && (
        <div
          onMouseEnter={() => onHoverMove && onHoverMove(topCandidate.bestMoveUci)}
          onMouseLeave={() => onHoverMove && onHoverMove(null)}
          className="bg-gradient-to-br from-emerald-950/40 via-stone-900 to-stone-900/90 border border-emerald-500/40 rounded-2xl p-4 shadow-xl transition-all hover:border-emerald-500/70"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-gradient-to-r from-emerald-500 to-teal-400 text-stone-950 text-xs font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                <Zap className="w-3.5 h-3.5 fill-current" /> BEST MOVE
              </span>
              <span className="text-2xl font-black text-white tracking-wide">
                {topCandidate.bestMoveSan || topCandidate.bestMoveUci}
              </span>
              <span className="text-xs text-stone-400 font-mono">
                ({topCandidate.bestMoveUci})
              </span>
            </div>

            {/* Score Pill */}
            {(() => {
              const sc = formatScore(topCandidate);
              return (
                <div
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-black tracking-tight shadow-md ${
                    sc.isMate
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400/40'
                      : sc.isWhiteAdvantage
                      ? 'bg-stone-100 text-stone-950 ring-2 ring-emerald-500/30'
                      : 'bg-stone-950 text-stone-100 border border-stone-700'
                  }`}
                >
                  {sc.text}
                </div>
              );
            })()}
          </div>

          <p className="text-xs text-stone-300 leading-relaxed mb-3">
            {getMoveInsight(topCandidate)}
          </p>

          {/* Continuation Sequence */}
          {topCandidate.pvSan && topCandidate.pvSan.length > 0 && (
            <div className="bg-stone-950/90 rounded-xl p-2.5 border border-stone-800/80 text-xs font-mono">
              <span className="text-stone-400 text-[10px] block mb-1 font-bold uppercase tracking-wider">
                Predicted Continuation:
              </span>
              <p className="text-emerald-300 leading-relaxed break-words text-xs">
                {topCandidate.pvSan.slice(0, 8).map((san, i) => (
                  <span key={i} className="mr-1.5">
                    <span className="text-stone-500 text-[10px]">{i + 1}.</span> {san}
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => onPlayMove(topCandidate.bestMoveUci)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 hover:scale-102 active:scale-98"
            >
              Play {topCandidate.bestMoveSan}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Multi-PV Alternative Candidate Moves */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-stone-400 font-bold px-1 uppercase tracking-wider">
          <span>Top Engine Candidates</span>
          <span>Score</span>
        </div>

        {engineLines.length === 0 ? (
          <div className="text-center py-6 text-stone-500 text-xs italic animate-pulse">
            Calculating tactical possibilities...
          </div>
        ) : (
          engineLines.slice(0, multiPvCount).map((line, idx) => {
            const sc = formatScore(line);
            const isTop = idx === 0;
            const isHovered = hoveredMoveUci === line.bestMoveUci;

            return (
              <div
                key={line.id || idx}
                onMouseEnter={() => onHoverMove && onHoverMove(line.bestMoveUci)}
                onMouseLeave={() => onHoverMove && onHoverMove(null)}
                onClick={() => onPlayMove(line.bestMoveUci)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'ring-2 ring-emerald-400 bg-stone-800'
                    : isTop
                    ? 'bg-emerald-950/20 border-emerald-700/40 hover:border-emerald-600'
                    : idx === 1
                    ? 'bg-stone-800/40 border-stone-800 hover:border-cyan-600/70'
                    : 'bg-stone-800/40 border-stone-800 hover:border-amber-600/70'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0
                        ? 'bg-emerald-500 text-stone-950'
                        : idx === 1
                        ? 'bg-cyan-500 text-stone-950'
                        : 'bg-amber-500 text-stone-950'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm group-hover:text-emerald-300 transition-colors">
                        {line.bestMoveSan || line.bestMoveUci}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        ({line.bestMoveUci})
                      </span>
                    </div>
                    {line.pvSan && line.pvSan.length > 1 && (
                      <div className="text-[11px] text-stone-400 font-mono truncate">
                        {line.pvSan.slice(1, 6).join(' ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-black ${
                      sc.isMate
                        ? 'bg-purple-950 text-purple-300 border border-purple-700'
                        : sc.isWhiteAdvantage
                        ? 'bg-stone-200 text-stone-950'
                        : 'bg-stone-950 text-stone-200 border border-stone-700'
                    }`}
                  >
                    {sc.text}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono hidden sm:inline">
                    d{line.depth}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Engine Controls Toolbar */}
      <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-stone-300">Engine:</span>
          <select
            value={selectedEngine}
            onChange={(e) => onSelectEngine && onSelectEngine(e.target.value as 'sf16' | 'sf10')}
            className="bg-stone-800 border border-stone-700 text-emerald-300 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="sf16">Stockfish 16 (NNUE)</option>
            <option value="sf10">Stockfish 10 (Classical)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">Depth:</span>
          <select
            value={depthLimit}
            onChange={(e) => onChangeDepth(Number(e.target.value))}
            className="bg-stone-800 border border-stone-700 text-stone-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="8">8 (Fast)</option>
            <option value="12">12 (Standard)</option>
            <option value="16">16 (Deep)</option>
            <option value="20">20 (Master ~3100 ELO)</option>
            <option value="24">24 (Grandmaster ~3500 ELO)</option>
            <option value="28">28 (Deep Analysis)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">Lines:</span>
          <div className="flex items-center gap-1 bg-stone-800 p-0.5 rounded-lg border border-stone-700">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => onChangeMultiPv(num)}
                className={`px-2.5 py-0.5 text-xs rounded-md transition-all cursor-pointer font-bold ${
                  multiPvCount === num
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
