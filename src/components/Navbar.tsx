import React from 'react';
import { RotateCw, Volume2, VolumeX, Palette, HelpCircle, Bot, Compass, RefreshCw, FolderOpen, FileText, Pencil, Undo2 } from 'lucide-react';
import { BoardTheme } from '../types/chess';

interface NavbarProps {
  mode: 'analysis' | 'play';
  onSelectMode: (mode: 'analysis' | 'play') => void;
  orientation: 'white' | 'black';
  onFlipBoard: () => void;
  onResetGame: () => void;
  onOpenSetupModal: () => void;
  onOpenImportModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: BoardTheme;
  onChangeTheme: (theme: BoardTheme) => void;
  onOpenHelpModal: () => void;
  isEditMode?: boolean;
  onToggleEditMode?: () => void;
  canUndo?: boolean;
  onUndoMove?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  onSelectMode,
  orientation,
  onFlipBoard,
  onResetGame,
  onOpenSetupModal,
  onOpenImportModal,
  soundEnabled,
  onToggleSound,
  theme,
  onChangeTheme,
  onOpenHelpModal,
  isEditMode = false,
  onToggleEditMode,
  canUndo = false,
  onUndoMove,
}) => {
  return (
    <header className="bg-stone-900 border-b border-stone-800 px-4 py-2.5 shadow-md select-none sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 font-black text-lg">
            ♟
          </div>
          <div>
            <h1 className="text-white font-extrabold text-sm md:text-base tracking-wide flex items-center gap-2">
              Chess Move Calculator
              <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Stockfish
              </span>
            </h1>
            <p className="text-[11px] text-stone-400 hidden md:block">
              Real-time deep position analysis, candidate lines &amp; best move calculator
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800">
          <button
            onClick={() => onSelectMode('analysis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'analysis'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Analysis Board</span>
          </button>
          <button
            onClick={() => onSelectMode('play')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mode === 'play'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Play vs Engine</span>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Undo Wrong Move */}
          {onUndoMove && (
            <button
              onClick={onUndoMove}
              disabled={!canUndo}
              title="Undo last move (if you moved the wrong piece)"
              className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 disabled:pointer-events-none text-stone-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}

          {/* Edit Position Toggle */}
          {onToggleEditMode && (
            <button
              onClick={onToggleEditMode}
              title="Edit board position (freely move, add, or remove any piece)"
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md shadow-amber-950/40 font-bold'
                  : 'border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white'
              }`}
            >
              <Pencil className={`w-3.5 h-3.5 ${isEditMode ? 'text-stone-950' : 'text-amber-400'}`} />
              <span className="hidden sm:inline">{isEditMode ? 'Editing Board' : 'Edit Position'}</span>
            </button>
          )}

          {/* Import Game / PGN / FEN */}
          <button
            onClick={onOpenImportModal}
            title="Import Game (Paste PGN, FEN, or Load from Chess.com)"
            className="px-2.5 py-1.5 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Import PGN</span>
          </button>

          {/* Preset / FEN Setup */}
          <button
            onClick={onOpenSetupModal}
            title="Setup Position or Load Preset"
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
          >
            <FolderOpen className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline font-medium">Presets</span>
          </button>

          {/* Flip Board */}
          <button
            onClick={onFlipBoard}
            title={`Flip board perspective (Currently: ${orientation})`}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Reset / Clear */}
          <button
            onClick={onResetGame}
            title="Reset to initial position"
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Theme Selector */}
          <div className="relative group">
            <button
              title="Board Theme"
              className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            >
              <Palette className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-stone-900 border border-stone-700 rounded-xl shadow-xl py-1 hidden group-hover:block z-50">
              {(
                [
                  { id: 'emerald', label: 'Emerald' },
                  { id: 'classic', label: 'Classic Wood' },
                  { id: 'wood', label: 'Walnut' },
                  { id: 'midnight', label: 'Midnight' },
                  { id: 'ocean', label: 'Ocean' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onChangeTheme(t.id)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-stone-800 cursor-pointer ${
                    theme === t.id ? 'text-emerald-400 font-bold' : 'text-stone-300'
                  }`}
                >
                  {t.label}
                  {theme === t.id && <span className="text-emerald-400 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute audio' : 'Unmute audio'}
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
          </button>

          {/* Help Info */}
          <button
            onClick={onOpenHelpModal}
            title="How to use Chess Move Calculator"
            className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
