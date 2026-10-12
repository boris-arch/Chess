import React from 'react';
import { X, Cpu, Compass, ArrowRight, Zap, Target } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-white font-bold text-base">How the Move Calculator Works</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs text-stone-300 leading-relaxed">
          {/* Section 1 */}
          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-2 text-emerald-400">
              <Zap className="w-4 h-4" /> 1. Visual Recommendation Arrows
            </h3>
            <p className="mb-2">
              The engine automatically calculates the strongest available moves and renders color-coded arrows directly onto the chessboard:
            </p>
            <ul className="space-y-1.5 pl-2 font-medium">
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0" />
                <span><strong className="text-emerald-400">Green Arrow:</strong> #1 Best move (Highest engine evaluation).</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block shrink-0" />
                <span><strong className="text-blue-400">Blue Arrow:</strong> #2 Alternative candidate move.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shrink-0" />
                <span><strong className="text-amber-400">Amber Arrow:</strong> #3 Third candidate move.</span>
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-2 text-emerald-400">
              <Target className="w-4 h-4" /> 2. Understanding the Evaluation Bar
            </h3>
            <p className="mb-2">
              The vertical bar next to the board shows which side has the positional or material advantage:
            </p>
            <ul className="space-y-1 pl-2">
              <li>• <strong className="text-stone-100">+1.50</strong>: White has an advantage equal to 1.5 pawns.</li>
              <li>• <strong className="text-stone-400">-2.00</strong>: Black has an advantage equal to 2 pawns.</li>
              <li>• <strong className="text-purple-400">M3 / -M2</strong>: Forced checkmate sequence in that number of moves.</li>
              <li>• <strong className="text-stone-300">0.00</strong>: Dead equal position.</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-2 text-emerald-400">
              <Compass className="w-4 h-4" /> 3. Controls &amp; Exploration
            </h3>
            <ul className="space-y-1.5 pl-2">
              <li>• <strong>Drag or Click:</strong> Drag pieces or click a square to view all valid moves.</li>
              <li>• <strong>Move History:</strong> Click any move in the notation list to travel back in time.</li>
              <li>• <strong>Custom Positions:</strong> Click "Position" to paste your own FEN or explore legendary tactical presets (Opera Game, Smothered Mate, Greek Gift).</li>
              <li>• <strong>Play vs Engine:</strong> Switch to Play mode to practice against the engine with customizable difficulty.</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
          >
            Got it, Let's Analyze!
          </button>
        </div>
      </div>
    </div>
  );
};
