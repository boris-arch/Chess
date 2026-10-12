import React from 'react';
import { Bot, User, Award, RotateCcw, Flag } from 'lucide-react';
import { PieceColor } from '../types/chess';

interface PlayEngineControlsProps {
  playerColor: PieceColor;
  onChangePlayerColor: (color: PieceColor) => void;
  botDifficulty: number; // 1 to 5
  onChangeBotDifficulty: (level: number) => void;
  isEngineThinking: boolean;
  gameStatus: string | null;
  onTakeback: () => void;
  onResign: () => void;
  onNewGame: () => void;
  canTakeback: boolean;
}

const DIFFICULTY_LEVELS = [
  { level: 1, name: 'Beginner', elo: '~800 ELO', desc: 'Makes occasional casual blunders' },
  { level: 2, name: 'Club Player', elo: '~1400 ELO', desc: 'Solid fundamentals, basic tactics' },
  { level: 3, name: 'Advanced', elo: '~1800 ELO', desc: 'Strong positional play and combinations' },
  { level: 4, name: 'Master', elo: '~2200 ELO', desc: 'Calculates deeply and capitalizes on mistakes' },
  { level: 5, name: 'Stockfish Max', elo: '2800+ ELO', desc: 'Maximum computation depth' },
];

export const PlayEngineControls: React.FC<PlayEngineControlsProps> = ({
  playerColor,
  onChangePlayerColor,
  botDifficulty,
  onChangeBotDifficulty,
  isEngineThinking,
  gameStatus,
  onTakeback,
  onResign,
  onNewGame,
  canTakeback,
}) => {
  const currentDiff = DIFFICULTY_LEVELS.find((d) => d.level === botDifficulty) || DIFFICULTY_LEVELS[2];

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 shadow-xl flex flex-col gap-3.5 text-stone-200">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Play Against Engine</h3>
            <p className="text-[11px] text-stone-400">Challenge the chess move calculator</p>
          </div>
        </div>

        {isEngineThinking && (
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-medium animate-pulse">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>Thinking...</span>
          </div>
        )}
      </div>

      {/* Game End Banner if applicable */}
      {gameStatus && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>{gameStatus}</span>
          </div>
          <button
            onClick={onNewGame}
            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold cursor-pointer"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Side selection */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-400 font-medium">Play as:</span>
        <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800">
          <button
            onClick={() => onChangePlayerColor('w')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              playerColor === 'w' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            White
          </button>
          <button
            onClick={() => onChangePlayerColor('b')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              playerColor === 'b' ? 'bg-stone-800 text-white shadow-sm' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-stone-900 border border-stone-600" />
            Black
          </button>
        </div>
      </div>

      {/* Difficulty level */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium">Difficulty Level:</span>
          <span className="text-purple-400 font-bold font-mono">
            {currentDiff.name} ({currentDiff.elo})
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {DIFFICULTY_LEVELS.map((diff) => (
            <button
              key={diff.level}
              onClick={() => onChangeBotDifficulty(diff.level)}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                botDifficulty === diff.level
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              Lvl {diff.level}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-stone-500 italic pt-0.5">{currentDiff.desc}</p>
      </div>

      {/* In-game action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-stone-800">
        <button
          onClick={onTakeback}
          disabled={!canTakeback || isEngineThinking}
          className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Takeback Move
        </button>
        <button
          onClick={onResign}
          disabled={!!gameStatus}
          className="py-2 px-3 bg-stone-800 hover:bg-red-950/60 border border-stone-700 hover:border-red-800 text-stone-400 hover:text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" />
          Resign
        </button>
      </div>
    </div>
  );
};
