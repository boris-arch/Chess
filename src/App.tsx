import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square as ChessSquare, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  BoardTheme,
  ChessEngineMoveLine,
  EngineStatus,
  MoveRecord,
  PieceColor,
  Square,
} from './types/chess';
import { sound } from './utils/sound';
import { identifyOpening } from './utils/openings';
import { engineService } from './engine/engineService';

import { Navbar } from './components/Navbar';
import { ChessBoard } from './components/ChessBoard/ChessBoard';
import { EvaluationBar } from './components/EvaluationBar';
import { EnginePanel } from './components/EnginePanel';
import { MoveHistory } from './components/MoveHistory';
import { PlayEngineControls } from './components/PlayEngineControls';
import { PositionSetupModal } from './components/PositionSetupModal';
import { ChesscomSyncModal } from './components/ChesscomSyncModal';
import { HelpModal } from './components/HelpModal';
import { Sparkles, Book, AlertCircle, Share2, Check, X, AlertTriangle, RefreshCw, FileText } from 'lucide-react';

export default function App() {
  // Main Chess Game state
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => game.fen());

  // History stack for navigation
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Captured pieces
  const [capturedWhite, setCapturedWhite] = useState<PieceSymbol[]>([]);
  const [capturedBlack, setCapturedBlack] = useState<PieceSymbol[]>([]);

  // Engine state
  const [engineLines, setEngineLines] = useState<ChessEngineMoveLine[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    isCalculating: false,
    depth: 0,
    maxDepth: 14,
    nps: 0,
    nodes: 0,
    timeMs: 0,
    engineName: 'Initializing Engine...',
    isStockfish: false,
  });

  // Settings & display
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [depthLimit, setDepthLimit] = useState(14);
  const [multiPvCount, setMultiPvCount] = useState(3);
  const [showArrows, setShowArrows] = useState(true);
  const [hoveredMoveUci, setHoveredMoveUci] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<'sf16' | 'sf10'>('sf16');
  const [theme, setTheme] = useState<BoardTheme>('emerald');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // App Modes
  const [mode, setMode] = useState<'analysis' | 'play'>('analysis');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [botDifficulty, setBotDifficulty] = useState(3);
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  const [gameStatusBanner, setGameStatusBanner] = useState<string | null>(null);

  // Modals & State
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isChesscomModalOpen, setIsChesscomModalOpen] = useState(false);
  const [chesscomUsername, setChesscomUsername] = useState(() => {
    return localStorage.getItem('chesscom_username') || '';
  });
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [activeMatchPlayers, setActiveMatchPlayers] = useState<{
    white: string;
    black: string;
    whiteRating?: number;
    blackRating?: number;
  } | null>(null);

  // Blunder Alert State
  const [blunderAlert, setBlunderAlert] = useState<{
    san: string;
    moveNumber: number;
    player: 'White' | 'Black';
    drop: number;
    prevEval: number;
    currentEval: number;
    depth?: number;
  } | null>(null);

  // Minimum search depth required to trigger blunder alerts (prevents shallow false positives)
  const [blunderMinDepth, setBlunderMinDepth] = useState<number>(() => {
    const saved = localStorage.getItem('blunder_min_depth');
    return saved ? Math.max(1, Number(saved)) : 10;
  });
  const blunderMinDepthRef = useRef(blunderMinDepth);
  blunderMinDepthRef.current = blunderMinDepth;

  // Ref to hold latest game instance and move history for engine evaluation tracking
  const gameRef = useRef(game);
  gameRef.current = game;
  const moveHistoryRef = useRef(moveHistory);
  moveHistoryRef.current = moveHistory;
  const currentMoveIndexRef = useRef(currentMoveIndex);
  currentMoveIndexRef.current = currentMoveIndex;

  // Baseline evaluation refs for blunder tracking across positions
  const prevPositionScoreRef = useRef<{ fen: string; scoreCp: number } | null>(null);
  const currentPositionScoreRef = useRef<{ fen: string; scoreCp: number; depth: number } | null>(null);
  const blunderCheckedForFenRef = useRef<string | null>(null);

  // Sound sync
  useEffect(() => {
    sound.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Subscribe to engine callbacks and detect significant blunders (> 2 points drop)
  // Only triggers when engine search depth meets or exceeds blunderMinDepth threshold
  useEffect(() => {
    const unsubEval = engineService.subscribeEvaluation((lines) => {
      setEngineLines(lines);

      if (lines.length > 0) {
        const top = lines[0];
        let currentCp = 0;
        if (top.mate !== null) {
          currentCp = top.mate > 0 ? 10000 - top.mate * 10 : -10000 - top.mate * 10;
        } else if (top.scoreCp !== null) {
          currentCp = top.scoreCp;
        }

        const currentFen = gameRef.current.fen();

        // If position transitioned to a new move/FEN, the last stable position eval becomes the baseline
        if (currentPositionScoreRef.current && currentPositionScoreRef.current.fen !== currentFen) {
          prevPositionScoreRef.current = {
            fen: currentPositionScoreRef.current.fen,
            scoreCp: currentPositionScoreRef.current.scoreCp,
          };
          blunderCheckedForFenRef.current = null;
        }

        // Keep updating current position score and depth as engine searches deeper
        currentPositionScoreRef.current = {
          fen: currentFen,
          scoreCp: currentCp,
          depth: top.depth,
        };

        const minDepthRequired = blunderMinDepthRef.current;
        const reachedRequiredDepth = top.depth >= minDepthRequired;
        const prev = prevPositionScoreRef.current;

        // Evaluate blunder ONLY if:
        // 1. We have a baseline evaluation for the position before this move
        // 2. The engine has reached the configured minimum search depth threshold (preventing shallow false positives)
        // 3. We haven't already evaluated and flagged this position
        if (
          prev &&
          prev.fen !== currentFen &&
          reachedRequiredDepth &&
          blunderCheckedForFenRef.current !== currentFen
        ) {
          const history = moveHistoryRef.current;
          const currentIdx = currentMoveIndexRef.current;
          if (currentIdx >= 0 && currentIdx < history.length) {
            const lastMoveRec = history[currentIdx];
            if (!lastMoveRec.evalScore) {
              lastMoveRec.evalScore = currentCp;
              blunderCheckedForFenRef.current = currentFen;

              // Calculate drop in pawns from the perspective of the player who made the move
              let dropPawns = 0;
              if (lastMoveRec.turn === 'w') {
                // White moved: a drop is prevCp - currentCp
                dropPawns = (prev.scoreCp - currentCp) / 100;
              } else {
                // Black moved: a drop for Black is currentCp - prevCp (White gained advantage)
                dropPawns = (currentCp - prev.scoreCp) / 100;
              }

              // Significant blunder condition: evaluation drops by more than 2 points (2.0 pawns)
              if (dropPawns >= 2.0) {
                lastMoveRec.isBlunder = true;
                lastMoveRec.evalDrop = dropPawns;
                const prevDisplay = (lastMoveRec.turn === 'w' ? prev.scoreCp : -prev.scoreCp) / 100;
                const currentDisplay = (lastMoveRec.turn === 'w' ? currentCp : -currentCp) / 100;

                setBlunderAlert({
                  san: lastMoveRec.san,
                  moveNumber: lastMoveRec.moveNumber,
                  player: lastMoveRec.turn === 'w' ? 'White' : 'Black',
                  drop: dropPawns,
                  prevEval: prevDisplay,
                  currentEval: currentDisplay,
                  depth: top.depth,
                });
                sound.playIllegal();
              }
            }
          }
        }
      }
    });

    const unsubStatus = engineService.subscribeStatus((status) => {
      setEngineStatus(status);
    });

    return () => {
      unsubEval();
      unsubStatus();
      engineService.stopAnalysis();
    };
  }, []);

  // Trigger analysis whenever position changes
  const runAnalysis = useCallback(
    (currentPositionFen: string) => {
      if (!autoAnalyze) return;
      engineService.startAnalysis(currentPositionFen, {
        depth: depthLimit,
        multiPv: multiPvCount,
      });
    },
    [autoAnalyze, depthLimit, multiPvCount]
  );

  useEffect(() => {
    runAnalysis(fen);
  }, [fen, runAnalysis]);

  // Detect opening based on SAN history
  const activeSanHistory = moveHistory
    .slice(0, currentMoveIndex + 1)
    .map((m) => m.san);
  const currentOpening = identifyOpening(activeSanHistory);

  // Trigger bot move in 'play' mode if it's the bot's turn
  useEffect(() => {
    if (mode !== 'play') return;
    if (game.isGameOver()) return;

    const currentTurn = game.turn();
    const isBotTurn = currentTurn !== playerColor;

    if (isBotTurn && !isEngineThinking) {
      setIsEngineThinking(true);

      const timer = setTimeout(async () => {
        try {
          const move = await engineService.getEngineMove(game.fen(), botDifficulty);
          if (move) {
            handleMakeMove(move.from, move.to, move.promotion);
          }
        } finally {
          setIsEngineThinking(false);
        }
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [mode, fen, playerColor, botDifficulty]);

  // Handle Game over alerts and sounds
  const checkGameOverStatus = useCallback((currentGame: Chess) => {
    if (currentGame.isCheckmate()) {
      const winner = currentGame.turn() === 'w' ? 'Black' : 'White';
      const msg = `Checkmate! ${winner} wins.`;
      setGameStatusBanner(msg);
      sound.playCheckmate();

      // Confetti celebration if human won or in analysis
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      return;
    }

    if (currentGame.isDraw()) {
      let reason = 'Draw';
      if (currentGame.isStalemate()) reason = 'Draw by Stalemate';
      else if (currentGame.isThreefoldRepetition()) reason = 'Draw by Threefold Repetition';
      else if (currentGame.isInsufficientMaterial()) reason = 'Draw by Insufficient Material';
      setGameStatusBanner(reason);
      return;
    }

    if (currentGame.inCheck()) {
      sound.playCheck();
      setGameStatusBanner('Check!');
      return;
    }

    setGameStatusBanner(null);
  }, []);

  // Update captured pieces array
  const recalculateCaptures = (historyMoves: MoveRecord[]) => {
    const whiteCaps: PieceSymbol[] = [];
    const blackCaps: PieceSymbol[] = [];

    historyMoves.forEach((m) => {
      if (m.captured) {
        if (m.turn === 'w') {
          // White captured black piece
          whiteCaps.push(m.captured);
        } else {
          // Black captured white piece
          blackCaps.push(m.captured);
        }
      }
    });

    setCapturedWhite(whiteCaps);
    setCapturedBlack(blackCaps);
  };

  // Execute a move on the board
  const handleMakeMove = (from: Square, to: Square, promotion: string = 'q'): boolean => {
    const newGame = new Chess(game.fen());

    try {
      const moveRes = newGame.move({
        from: from as ChessSquare,
        to: to as ChessSquare,
        promotion,
      });

      if (!moveRes) {
        sound.playIllegal();
        return false;
      }

      // Play proper sound
      if (moveRes.captured) {
        sound.playCapture();
      } else if (moveRes.san === 'O-O' || moveRes.san === 'O-O-O') {
        sound.playCastle();
      } else {
        sound.playMove();
      }

      // Record move
      const newRecord: MoveRecord = {
        san: moveRes.san,
        uci: `${from}${to}${moveRes.promotion || ''}`,
        from,
        to,
        captured: moveRes.captured as PieceSymbol | undefined,
        promotion: moveRes.promotion,
        fenBefore: game.fen(),
        fenAfter: newGame.fen(),
        turn: game.turn(),
        moveNumber: Math.floor(moveHistory.length / 2) + 1,
      };

      // Truncate future branch if moved from an earlier point in history
      const newHistory = [...moveHistory.slice(0, currentMoveIndex + 1), newRecord];
      const newIdx = newHistory.length - 1;

      setGame(newGame);
      setFen(newGame.fen());
      setMoveHistory(newHistory);
      setCurrentMoveIndex(newIdx);
      setLastMove({ from, to });
      recalculateCaptures(newHistory);

      checkGameOverStatus(newGame);
      return true;
    } catch {
      sound.playIllegal();
      return false;
    }
  };

  // Jump to specific move in history
  const handleSelectHistoryMove = (index: number) => {
    if (index < 0 || index >= moveHistory.length) return;
    const targetMove = moveHistory[index];
    const targetGame = new Chess(targetMove.fenAfter);

    setGame(targetGame);
    setFen(targetGame.fen());
    setCurrentMoveIndex(index);
    setLastMove({ from: targetMove.from, to: targetMove.to });
    checkGameOverStatus(targetGame);
  };

  const handleFirstMove = () => {
    if (moveHistory.length === 0) return;
    const firstFen = moveHistory[0].fenBefore;
    const firstGame = new Chess(firstFen);
    setGame(firstGame);
    setFen(firstGame.fen());
    setCurrentMoveIndex(-1);
    setLastMove(null);
    checkGameOverStatus(firstGame);
  };

  const handlePrevMove = () => {
    if (currentMoveIndex > 0) {
      handleSelectHistoryMove(currentMoveIndex - 1);
    } else if (currentMoveIndex === 0) {
      handleFirstMove();
    }
  };

  const handleNextMove = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      handleSelectHistoryMove(currentMoveIndex + 1);
    }
  };

  const handleLastMove = () => {
    if (moveHistory.length > 0) {
      handleSelectHistoryMove(moveHistory.length - 1);
    }
  };

  // Reset entire game
  const handleResetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setGameStatusBanner(null);
    setBlunderAlert(null);
    setActiveMatchPlayers(null);
    prevPositionScoreRef.current = null;
    currentPositionScoreRef.current = null;
    blunderCheckedForFenRef.current = null;
    sound.playMove();
  };

  // Load custom FEN string
  const handleLoadFen = (newFen: string): boolean => {
    try {
      const newGame = new Chess(newFen);
      setGame(newGame);
      setFen(newGame.fen());
      setMoveHistory([]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setCapturedWhite([]);
      setCapturedBlack([]);
      setGameStatusBanner(null);
      setBlunderAlert(null);
      prevPositionScoreRef.current = null;
      currentPositionScoreRef.current = null;
      blunderCheckedForFenRef.current = null;
      sound.playMove();
      return true;
    } catch {
      return false;
    }
  };

  // Load PGN string
  const handleLoadPgn = (pgnStr: string): boolean => {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgnStr);

      const headers = newGame.header();
      const initialFen = headers['FEN'] || undefined;
      const history = newGame.history({ verbose: true });
      let replayGame: Chess;
      try {
        replayGame = initialFen ? new Chess(initialFen) : new Chess();
      } catch {
        replayGame = new Chess();
      }
      const records: MoveRecord[] = [];

      for (const m of history) {
        const fenBefore = replayGame.fen();
        try {
          replayGame.move(m);
        } catch {
          // Break gracefully if any downstream move fails replay
          break;
        }
        records.push({
          san: m.san,
          uci: `${m.from}${m.to}${m.promotion || ''}`,
          from: m.from as Square,
          to: m.to as Square,
          captured: m.captured as PieceSymbol | undefined,
          promotion: m.promotion,
          fenBefore,
          fenAfter: replayGame.fen(),
          turn: m.color,
          moveNumber: Math.floor(records.length / 2) + 1,
        });
      }

      setGame(newGame);
      setFen(newGame.fen());
      setMoveHistory(records);
      setCurrentMoveIndex(records.length - 1);
      setLastMove(
        records.length > 0
          ? { from: records[records.length - 1].from, to: records[records.length - 1].to }
          : null
      );
      recalculateCaptures(records);
      checkGameOverStatus(newGame);
      sound.playMove();
      return true;
    } catch {
      return false;
    }
  };

  const handleQuickPasteMoves = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text ? text.trim() : '';
      if (clean) {
        if (clean.includes('/') && clean.split('/').length >= 7) {
          handleLoadFen(clean);
          setActiveMatchPlayers(null);
          setGameStatusBanner('Pasted FEN position loaded onto board!');
          return;
        }
        const ok = handleLoadPgn(clean);
        if (ok) {
          setActiveMatchPlayers(null);
          setGameStatusBanner('Pasted moves loaded onto board!');
          return;
        }
      }
    } catch {}
    setIsChesscomModalOpen(true);
  }, []);

  // Play a move recommendation from the engine panel
  const handlePlayEngineMove = (uci: string) => {
    if (!uci || uci.length < 4) return;
    const from = uci.substring(0, 2) as Square;
    const to = uci.substring(2, 4) as Square;
    const promotion = uci.length > 4 ? uci[4] : undefined;
    handleMakeMove(from, to, promotion);
  };

  // Play vs Engine controls
  const handleTakeback = () => {
    if (moveHistory.length < 2) {
      handleResetGame();
      return;
    }
    // In play vs engine, take back 2 moves (both engine and player's move)
    const targetIdx = Math.max(-1, currentMoveIndex - 2);
    if (targetIdx === -1) {
      handleFirstMove();
    } else {
      handleSelectHistoryMove(targetIdx);
    }
  };

  const handleResign = () => {
    const winner = playerColor === 'w' ? 'Black (Engine)' : 'White (Engine)';
    setGameStatusBanner(`${winner} wins by resignation.`);
    sound.playIllegal();
  };

  const handleFlipBoard = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleSharePosition = () => {
    navigator.clipboard.writeText(fen);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2000);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        mode={mode}
        onSelectMode={(m) => {
          setMode(m);
          if (m === 'play') {
            setOrientation(playerColor === 'w' ? 'white' : 'black');
          }
        }}
        orientation={orientation}
        onFlipBoard={handleFlipBoard}
        onResetGame={handleResetGame}
        onOpenSetupModal={() => setIsSetupModalOpen(true)}
        onOpenImportModal={() => setIsChesscomModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        theme={theme}
        onChangeTheme={setTheme}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 flex flex-col gap-4">
        {/* Imported Match Details (shown only if a game was imported) */}
        {activeMatchPlayers && (
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
            <div className="flex items-center gap-2 text-stone-300">
              <span className="font-bold text-emerald-400">Imported Match:</span>
              <span className="font-semibold text-white">
                {activeMatchPlayers.white} ({activeMatchPlayers.whiteRating || '?'}) vs{' '}
                {activeMatchPlayers.black} ({activeMatchPlayers.blackRating || '?'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsChesscomModalOpen(true)}
                className="px-2.5 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Import Another
              </button>
              <button
                onClick={() => setActiveMatchPlayers(null)}
                className="px-2.5 py-1 text-[11px] bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Clear match header"
              >
                Clear Info
              </button>
            </div>
          </div>
        )}
        {/* Active Opening Banner */}
        {currentOpening && (
          <div className="bg-stone-900/90 border border-emerald-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Book className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-white truncate">
                    {currentOpening.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                    {currentOpening.eco}
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-mono truncate">
                  {currentOpening.moves}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleQuickPasteMoves}
                title="Paste moves or FEN from clipboard"
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-medium">Paste Moves</span>
              </button>
              <button
                onClick={handleSharePosition}
                title="Copy FEN to share"
                className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isCopiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline font-medium">
                  {isCopiedShare ? 'Copied' : 'Share FEN'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Game Alert Banner */}
        {gameStatusBanner && (
          <div className="bg-gradient-to-r from-amber-950/80 to-stone-900 border border-amber-500/40 rounded-xl px-4 py-2.5 flex items-center gap-3 text-amber-200 text-xs sm:text-sm font-semibold shadow-md animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{gameStatusBanner}</span>
          </div>
        )}

        {/* Blunder Visual Alert Banner */}
        {blunderAlert && (
          <div className="bg-gradient-to-r from-red-950/90 via-rose-950/80 to-stone-900 border border-red-500/60 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-red-200 shadow-xl shadow-red-950/50 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center font-black text-sm shrink-0">
                ??
              </div>
              <div>
                <div className="font-bold text-xs sm:text-sm text-red-100 flex items-center gap-2">
                  <span>Blunder Alert!</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-900 border border-red-700 text-red-200 font-mono">
                    {blunderAlert.player} Move {blunderAlert.moveNumber} ({blunderAlert.san})
                  </span>
                  {blunderAlert.depth ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 border border-red-800 text-red-300 font-mono">
                      depth {blunderAlert.depth}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-red-300/90 mt-0.5">
                  Evaluation dropped by <span className="font-bold text-red-100">-{blunderAlert.drop.toFixed(1)} points</span> (from {blunderAlert.prevEval > 0 ? '+' : ''}{blunderAlert.prevEval.toFixed(1)} to {blunderAlert.currentEval > 0 ? '+' : ''}{blunderAlert.currentEval.toFixed(1)}).
                </p>
              </div>
            </div>
            <button
              onClick={() => setBlunderAlert(null)}
              className="p-1.5 text-red-400 hover:text-white hover:bg-red-900/50 rounded-lg transition-colors cursor-pointer"
              title="Dismiss blunder alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] xl:grid-cols-[auto_340px_340px] gap-4 items-start">
          {/* Left Column: Evaluation Bar + Chessboard */}
          <div className="flex items-stretch justify-center gap-2 sm:gap-3 bg-stone-900/60 p-2 sm:p-4 rounded-2xl border border-stone-800 shadow-xl">
            {/* Real-time Vertical Evaluation Gauge */}
            <EvaluationBar
              engineLines={engineLines}
              orientation={orientation}
              isCalculating={engineStatus.isCalculating}
            />

            {/* Interactive Chess Board with Arrows & Controls */}
            <div className="flex-1 max-w-[620px] flex flex-col gap-1.5">
              {/* Top Player Bar (Opponent if viewing as White, User if viewing as Black) */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-stone-950/70 rounded-xl text-xs border border-stone-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full border shadow-sm ${
                      orientation === 'white'
                        ? 'bg-stone-900 border-stone-600'
                        : 'bg-white border-stone-300'
                    }`}
                  />
                  <span className="font-bold text-white text-xs truncate max-w-[180px]">
                    {orientation === 'white'
                      ? activeMatchPlayers?.black || 'Black'
                      : activeMatchPlayers?.white || 'White'}
                  </span>
                  {(orientation === 'white'
                    ? activeMatchPlayers?.blackRating
                    : activeMatchPlayers?.whiteRating) ? (
                    <span className="text-[10px] text-stone-400 font-mono px-1.5 py-0.2 rounded bg-stone-900 border border-stone-800">
                      {orientation === 'white'
                        ? activeMatchPlayers?.blackRating
                        : activeMatchPlayers?.whiteRating}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {game.turn() === (orientation === 'white' ? 'b' : 'w') && (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px] bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      To Move
                    </span>
                  )}
                </div>
              </div>

              {/* Chessboard Canvas */}
              <ChessBoard
                game={game}
                orientation={orientation}
                theme={theme}
                engineLines={engineLines}
                showArrows={showArrows}
                lastMove={lastMove}
                onMove={handleMakeMove}
                disabled={mode === 'play' && isEngineThinking}
                hoveredMoveUci={hoveredMoveUci}
              />

              {/* Bottom Player Bar */}
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-stone-950/70 rounded-xl text-xs border border-stone-800">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full border shadow-sm ${
                      orientation === 'white'
                        ? 'bg-white border-stone-300'
                        : 'bg-stone-900 border-stone-600'
                    }`}
                  />
                  <span className="font-bold text-white text-xs truncate max-w-[180px]">
                    {orientation === 'white'
                      ? activeMatchPlayers?.white || 'White'
                      : activeMatchPlayers?.black || 'Black'}
                  </span>
                  {(orientation === 'white'
                    ? activeMatchPlayers?.whiteRating
                    : activeMatchPlayers?.blackRating) ? (
                    <span className="text-[10px] text-stone-400 font-mono px-1.5 py-0.2 rounded bg-stone-900 border border-stone-800">
                      {orientation === 'white'
                        ? activeMatchPlayers?.whiteRating
                        : activeMatchPlayers?.blackRating}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  {game.turn() === (orientation === 'white' ? 'w' : 'b') && (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px] bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      To Move
                    </span>
                  )}
                  <button
                    onClick={handleFlipBoard}
                    className="p-1 px-1.5 text-stone-300 hover:text-white rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 transition-colors cursor-pointer text-[10px] flex items-center gap-1 font-semibold"
                    title={`Flip board perspective (Currently: ${orientation})`}
                  >
                    <RefreshCw className="w-3 h-3 text-emerald-400" />
                    <span>Flip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Engine Calculator & Analysis Panel */}
          <div className="w-full flex flex-col gap-4">
            <EnginePanel
              engineLines={engineLines}
              engineStatus={engineStatus}
              autoAnalyze={autoAnalyze}
              onToggleAutoAnalyze={() => setAutoAnalyze((prev) => !prev)}
              onRecalculate={() => runAnalysis(game.fen())}
              onPlayMove={handlePlayEngineMove}
              depthLimit={depthLimit}
              onChangeDepth={setDepthLimit}
              multiPvCount={multiPvCount}
              onChangeMultiPv={setMultiPvCount}
              showArrows={showArrows}
              onToggleArrows={() => setShowArrows((prev) => !prev)}
              hoveredMoveUci={hoveredMoveUci}
              onHoverMove={setHoveredMoveUci}
              selectedEngine={selectedEngine}
              onSelectEngine={(eng) => {
                setSelectedEngine(eng);
                engineService.setPreferredEngine(eng);
              }}
              blunderMinDepth={blunderMinDepth}
              onChangeBlunderMinDepth={(d) => {
                setBlunderMinDepth(d);
                localStorage.setItem('blunder_min_depth', String(d));
              }}
            />
          </div>

          {/* Right Column: Move History & Play Mode Controls */}
          <div className="w-full flex flex-col gap-4">
            {mode === 'play' ? (
              <PlayEngineControls
                playerColor={playerColor}
                onChangePlayerColor={(color) => {
                  setPlayerColor(color);
                  setOrientation(color === 'w' ? 'white' : 'black');
                }}
                botDifficulty={botDifficulty}
                onChangeBotDifficulty={setBotDifficulty}
                isEngineThinking={isEngineThinking}
                gameStatus={gameStatusBanner}
                onTakeback={handleTakeback}
                onResign={handleResign}
                onNewGame={handleResetGame}
                canTakeback={moveHistory.length > 0}
              />
            ) : null}

            {/* Interactive Move Notation History */}
            <div className="h-[360px]">
              <MoveHistory
                moves={moveHistory}
                currentMoveIndex={currentMoveIndex}
                onSelectMove={handleSelectHistoryMove}
                onFirstMove={handleFirstMove}
                onPrevMove={handlePrevMove}
                onNextMove={handleNextMove}
                onLastMove={handleLastMove}
                capturedWhite={capturedWhite}
                capturedBlack={capturedBlack}
                fen={fen}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Position Setup & FEN/PGN Modal */}
      <PositionSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        onLoadFen={handleLoadFen}
        onLoadPgn={handleLoadPgn}
        currentFen={fen}
      />

      {/* Chess Game Import Modal */}
      <ChesscomSyncModal
        isOpen={isChesscomModalOpen}
        onClose={() => setIsChesscomModalOpen(false)}
        onLoadFen={handleLoadFen}
        onLoadPgn={handleLoadPgn}
        onSetOrientation={(ori) => setOrientation(ori)}
        onSetMatchPlayers={setActiveMatchPlayers}
        initialUsername={chesscomUsername}
      />

      {/* Help & Calculator Guide Modal */}
      <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
    </div>
  );
}
