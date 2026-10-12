import React, { useState } from 'react';
import { X, Check, BookOpen, Swords, Trophy, Play } from 'lucide-react';
import { PresetPosition } from '../types/chess';

interface PositionSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
  currentFen: string;
}

export const PRESET_POSITIONS: PresetPosition[] = [
  {
    title: 'Standard Starting Position',
    category: 'opening',
    description: 'Initial 32-piece classical starting layout.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    toMove: 'w',
  },
  {
    title: "Opera Game: Morphy's Masterpiece",
    category: 'famous',
    description: 'Paul Morphy with a spectacular queen sacrifice leading to forced checkmate (1858).',
    fen: '4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 14',
    toMove: 'w',
  },
  {
    title: 'Smothered Mate in 2',
    category: 'tactics',
    description: 'Classic knight tactic: sacrifice the queen to suffocate the enemy king.',
    fen: '6k1/5ppp/8/8/8/5Q2/4N1PP/6K1 w - - 0 1',
    toMove: 'w',
  },
  {
    title: 'Greek Gift Sacrifice (Bxh7+)',
    category: 'tactics',
    description: 'The prototypical kingside bishop sacrifice blowing open the castled king.',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 0 7',
    toMove: 'w',
  },
  {
    title: 'Lucena Position (Rook Endgame)',
    category: 'endgame',
    description: 'The cornerstone technique of rook & pawn endgames: building the bridge.',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    toMove: 'w',
  },
  {
    title: 'Philidor Defense: Third Rank',
    category: 'endgame',
    description: 'Essential drawing technique in rook and pawn endings.',
    fen: '8/8/3k4/8/3K4/2R5/8/r7 b - - 0 1',
    toMove: 'b',
  },
  {
    title: 'Sicilian Defense: Najdorf',
    category: 'opening',
    description: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
    toMove: 'w',
  },
  {
    title: "Queen's Gambit Declined",
    category: 'opening',
    description: '1. d4 d5 2. c4 e6 3. Nc3 Nf6',
    fen: 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
    toMove: 'w',
  },
];

export const PositionSetupModal: React.FC<PositionSetupModalProps> = ({
  isOpen,
  onClose,
  onLoadFen,
  onLoadPgn,
  currentFen,
}) => {
  const [fenInput, setFenInput] = useState(currentFen);
  const [pgnInput, setPgnInput] = useState('');
  const [activeTab, setActiveTab] = useState<'presets' | 'fen' | 'pgn'>('presets');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleApplyFen = () => {
    setErrorMessage('');
    const success = onLoadFen(fenInput.trim());
    if (success) {
      onClose();
    } else {
      setErrorMessage('Invalid FEN format. Please verify the string syntax.');
    }
  };

  const handleApplyPgn = () => {
    setErrorMessage('');
    const success = onLoadPgn(pgnInput.trim());
    if (success) {
      onClose();
    } else {
      setErrorMessage('Invalid PGN notation. Could not parse moves.');
    }
  };

  const handleSelectPreset = (fen: string) => {
    onLoadFen(fen);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-bold text-base tracking-wide">
              Position Setup &amp; Library
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/60 p-1">
          <button
            onClick={() => {
              setActiveTab('presets');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'bg-stone-800 text-emerald-400 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Famous Presets &amp; Puzzles
          </button>
          <button
            onClick={() => {
              setActiveTab('fen');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'fen'
                ? 'bg-stone-800 text-emerald-400 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Custom FEN
          </button>
          <button
            onClick={() => {
              setActiveTab('pgn');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'pgn'
                ? 'bg-stone-800 text-emerald-400 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Import PGN
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="mb-3 p-2.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs">
              {errorMessage}
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {PRESET_POSITIONS.map((preset, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectPreset(preset.fen)}
                  className="p-3 rounded-xl bg-stone-950/60 hover:bg-stone-800/80 border border-stone-800/80 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-bold text-xs group-hover:text-emerald-300 transition-colors">
                        {preset.title}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300">
                        {preset.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 leading-relaxed mb-2">
                      {preset.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-stone-800/60 text-[10px] text-stone-500">
                    <span>Turn: {preset.toMove === 'w' ? 'White' : 'Black'}</span>
                    <span className="text-emerald-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Load Position →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'fen' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Forsyth-Edwards Notation (FEN):
                </label>
                <textarea
                  rows={4}
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleApplyFen}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-lg"
              >
                Load FEN to Board
              </button>
            </div>
          )}

          {activeTab === 'pgn' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Portable Game Notation (PGN):
                </label>
                <textarea
                  rows={6}
                  value={pgnInput}
                  onChange={(e) => setPgnInput(e.target.value)}
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={handleApplyPgn}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-lg"
              >
                Parse &amp; Load PGN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
