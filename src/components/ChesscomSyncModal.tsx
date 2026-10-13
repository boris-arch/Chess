import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  RefreshCw,
  Radio,
  AlertCircle,
  ExternalLink,
  User,
  Zap,
  Copy,
  Check,
  Play,
  SquareCheck,
  Square,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  ChesscomGameInfo,
  extractGameId,
  fetchDailyGames,
  fetchRecentGames,
  fetchLiveGameCallback,
} from '../utils/chesscom';

interface ChesscomSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
  onSetOrientation: (orientation: 'white' | 'black') => void;
  isSyncActive: boolean;
  activeUsername: string;
  onToggleSync: (active: boolean, username: string) => void;
  activeLiveGameId: string | null;
  onStartLiveGameWatch: (gameId: string, playerColorHint?: 'white' | 'black') => void;
  onStopLiveGameWatch: () => void;
  liveWatchMoveCount?: number;
}

export const ChesscomSyncModal: React.FC<ChesscomSyncModalProps> = ({
  isOpen,
  onClose,
  onLoadFen,
  onLoadPgn,
  onSetOrientation,
  isSyncActive,
  activeUsername,
  onToggleSync,
  activeLiveGameId,
  onStartLiveGameWatch,
  onStopLiveGameWatch,
  liveWatchMoveCount = 0,
}) => {
  // Tabs: 'live' | 'user' | 'paste'
  const [activeTab, setActiveTab] = useState<'live' | 'user' | 'paste'>('live');

  // Tab 1: Live Game Link / ID
  const [liveGameInput, setLiveGameInput] = useState<string>(activeLiveGameId || '');
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveSuccessMsg, setLiveSuccessMsg] = useState<string | null>(null);

  // Tab 2: Username sync
  const [username, setUsername] = useState<string>(() => {
    return activeUsername || localStorage.getItem('chesscom_username') || 'pecanduLCbkp';
  });
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [dailyGames, setDailyGames] = useState<ChesscomGameInfo[]>([]);
  const [recentGames, setRecentGames] = useState<ChesscomGameInfo[]>([]);
  const [hasSearchedUser, setHasSearchedUser] = useState(false);
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);

  // Tab 3: Paste
  const [pastedInput, setPastedInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  // Remember username in localStorage
  useEffect(() => {
    if (activeUsername) {
      setUsername(activeUsername);
      localStorage.setItem('chesscom_username', activeUsername);
    }
  }, [activeUsername]);

  useEffect(() => {
    if (activeLiveGameId) {
      setLiveGameInput(activeLiveGameId);
    }
  }, [activeLiveGameId]);

  // Load user data on first open if username is provided
  useEffect(() => {
    if (isOpen && username && !hasSearchedUser) {
      handleSearchUsername(username, true);
    }
  }, [isOpen]);

  // Handle Search for Username
  const handleSearchUsername = async (userToQuery: string, silent = false) => {
    const clean = userToQuery.trim().toLowerCase();
    if (!clean) {
      setUserError('Please enter a Chess.com username');
      return;
    }

    if (!silent) {
      setIsUserLoading(true);
      setUserError(null);
    }

    try {
      localStorage.setItem('chesscom_username', clean);

      // Fetch daily games
      let ongoing: ChesscomGameInfo[] = [];
      try {
        ongoing = await fetchDailyGames(clean);
        setDailyGames(ongoing);
      } catch (err: any) {
        if (!silent && err.message?.includes('does not exist')) {
          setUserError(err.message);
          return;
        }
      }

      // Fetch recent archives
      const recents = await fetchRecentGames(clean, 6);
      setRecentGames(recents);
      setHasSearchedUser(true);

      // If active games exist, auto-select first
      if (ongoing.length > 0) {
        const first = ongoing[0];
        setSelectedGameUrl(first.url);
        const isWhite = first.white.username.toLowerCase() === clean;
        onSetOrientation(isWhite ? 'white' : 'black');
        if (first.pgn) onLoadPgn(first.pgn);
        else if (first.fen) onLoadFen(first.fen);
      } else if (recents.length > 0) {
        // Auto-load latest finished game (e.g. Rapid / Blitz match)
        const latest = recents[0];
        setSelectedGameUrl(latest.url);
        const isWhite = latest.white.username.toLowerCase() === clean;
        onSetOrientation(isWhite ? 'white' : 'black');
        if (latest.pgn) onLoadPgn(latest.pgn);
        else if (latest.fen) onLoadFen(latest.fen);
      }
    } catch (err: any) {
      if (!silent) {
        setUserError(err.message || 'Failed to fetch player data from Chess.com.');
      }
    } finally {
      if (!silent) {
        setIsUserLoading(false);
      }
    }
  };

  // Connect & watch Live Game by URL / ID
  const handleConnectLiveGame = async (inputStr: string) => {
    setLiveError(null);
    setLiveSuccessMsg(null);
    const gameId = extractGameId(inputStr);

    if (!gameId) {
      setLiveError('Please enter a valid Chess.com Game URL (e.g. chess.com/game/live/185196460786) or Game ID number.');
      return;
    }

    setIsLiveLoading(true);
    try {
      const res = await fetchLiveGameCallback(gameId);
      if (!res.success || !res.pgn) {
        setLiveError(res.error || 'Could not load this game from Chess.com.');
        return;
      }

      // Load PGN onto the board
      const ok = onLoadPgn(res.pgn);
      if (!ok) {
        setLiveError('Could not parse chess moves from game data.');
        return;
      }

      // Set board orientation: if username matches black, flip to black, else white
      const cleanUser = username.trim().toLowerCase();
      if (res.black && res.black.toLowerCase() === cleanUser) {
        onSetOrientation('black');
      } else {
        onSetOrientation('white');
      }

      // Start the live background watcher
      onStartLiveGameWatch(gameId);
      setLiveSuccessMsg(`Connected! Game #${gameId} loaded. Real-time auto-move is active.`);
    } catch (err: any) {
      setLiveError(err.message || 'Failed to connect to Chess.com live game.');
    } finally {
      setIsLiveLoading(false);
    }
  };

  // Load a game from recent games or daily list
  const handleLoadGame = (game: ChesscomGameInfo, autoClose = true) => {
    setSelectedGameUrl(game.url);
    const cleanUser = username.trim().toLowerCase();
    const isWhite = game.white.username.toLowerCase() === cleanUser;
    onSetOrientation(isWhite ? 'white' : 'black');

    let loaded = false;
    if (game.pgn) {
      loaded = onLoadPgn(game.pgn);
    } else if (game.fen) {
      loaded = onLoadFen(game.fen);
    }

    if (loaded && autoClose) {
      onClose();
    }
  };

  // Manual import FEN/PGN
  const handleManualImport = () => {
    setPasteFeedback(null);
    const text = pastedInput.trim();
    if (!text) return;

    if (text.includes('/') && text.split(' ').length >= 2) {
      const ok = onLoadFen(text);
      if (ok) {
        setPasteFeedback('FEN loaded successfully!');
        setTimeout(() => onClose(), 600);
      } else {
        setPasteFeedback('Invalid FEN position string.');
      }
    } else {
      const ok = onLoadPgn(text);
      if (ok) {
        setPasteFeedback('PGN moves loaded successfully!');
        setTimeout(() => onClose(), 600);
      } else {
        setPasteFeedback('Could not parse PGN moves.');
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLiveGameInput(text);
        handleConnectLiveGame(text);
      }
    } catch {
      // clipboard read denied
    }
  };

  if (!isOpen) return null;

  const latestRecentGame = recentGames.length > 0 ? recentGames[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Radio
                className={`w-4 h-4 ${
                  activeLiveGameId || isSyncActive ? 'animate-pulse text-emerald-400' : ''
                }`}
              />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Live Game Sync with Chess.com
                {activeLiveGameId ? (
                  <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30 font-mono animate-pulse">
                    LIVE GAME #{activeLiveGameId}
                  </span>
                ) : isSyncActive ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono animate-pulse">
                    WATCHING @{activeUsername}
                  </span>
                ) : null}
              </h2>
              <p className="text-[11px] text-stone-400">
                Mirror your moves automatically in real time while playing on Chess.com
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'live'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Game URL / ID (Auto-Move)</span>
          </button>

          <button
            onClick={() => setActiveTab('user')}
            className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'user'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Username &amp; Archive Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Paste Moves / PGN</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* TAB 1: Live Game Link / ID */}
          {activeTab === 'live' && (
            <div className="space-y-3">
              {/* Active Watcher Banner if active */}
              {activeLiveGameId && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-white text-xs">
                        Auto-Move Active for Game #{activeLiveGameId}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      The board automatically makes moves as you and your opponent play on Chess.com!
                    </p>
                  </div>
                  <button
                    onClick={onStopLiveGameWatch}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Stop Auto-Move
                  </button>
                </div>
              )}

              {/* Game URL Input Box */}
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-stone-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Paste Chess.com Live Game URL or Game ID
                    </label>
                    <span className="text-[10px] text-stone-400">Rapid, Blitz, Bullet, Daily</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={liveGameInput}
                      onChange={(e) => setLiveGameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleConnectLiveGame(liveGameInput)}
                      placeholder="e.g. https://www.chess.com/game/live/185196460786 or 185196460786"
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                    />

                    <button
                      onClick={() => handleConnectLiveGame(liveGameInput)}
                      disabled={isLiveLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-950/50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLiveLoading ? 'animate-spin' : ''}`} />
                      <span>{isLiveLoading ? 'Connecting...' : 'Watch & Auto-Move'}</span>
                    </button>
                  </div>
                </div>

                {/* Quick Helper buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <button
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>Paste From Clipboard</span>
                  </button>

                  {latestRecentGame?.url && extractGameId(latestRecentGame.url) ? (
                    <button
                      onClick={() => {
                        const id = extractGameId(latestRecentGame.url!)!;
                        setLiveGameInput(id);
                        handleConnectLiveGame(id);
                      }}
                      className="px-2.5 py-1 bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/60 text-emerald-300 font-semibold rounded flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span>Use Detected Match (#{extractGameId(latestRecentGame.url!)})</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setLiveGameInput('185197747010');
                        handleConnectLiveGame('185197747010');
                      }}
                      className="px-2.5 py-1 bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-stone-200 rounded border border-stone-700/60 cursor-pointer transition-colors"
                    >
                      Try Sample Game (#185197747010)
                    </button>
                  )}
                </div>
              </div>

              {/* Error & Success Messages */}
              {liveError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{liveError}</span>
                </div>
              )}

              {liveSuccessMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/60 rounded-xl text-emerald-300 flex items-start gap-2">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{liveSuccessMsg}</span>
                </div>
              )}

              {/* How it works info card */}
              <div className="bg-stone-950/40 border border-stone-800 rounded-xl p-3.5 space-y-2 text-stone-300 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>How Real-Time Auto-Move Works</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-stone-400 leading-relaxed text-[11px]">
                  <li>
                    When you start a match on <strong>Chess.com</strong>, copy the game link from your browser URL bar (e.g.{' '}
                    <code className="text-stone-300 bg-stone-900 px-1 py-0.5 rounded font-mono">
                      chess.com/game/live/185196460786
                    </code>
                    ).
                  </li>
                  <li>
                    Paste it above and click <strong>"Watch &amp; Auto-Move"</strong>.
                  </li>
                  <li>
                    The chessboard will load your game, match your player orientation, and{' '}
                    <strong>automatically advance the board</strong> whenever you or your opponent make a move!
                  </li>
                  <li>
                    Stockfish will analyze each new position in real time with candidate arrows and evaluation.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Username & Archive Sync */}
          {activeTab === 'user' && (
            <div className="space-y-4">
              {/* Username Input & Auto-Sync Toggle */}
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-stone-200 mb-1">
                    Chess.com Username
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchUsername(username)}
                        placeholder="e.g. pecanduLCbkp or magnuscarlsen"
                        className="w-full pl-8 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      onClick={() => handleSearchUsername(username)}
                      disabled={isUserLoading}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUserLoading ? 'animate-spin' : ''}`} />
                      <span>Check Games</span>
                    </button>
                  </div>
                </div>

                {/* Auto-Sync Toggle Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-800">
                  <div className="flex items-center gap-1.5 text-stone-300">
                    <Radio className={`w-3.5 h-3.5 ${isSyncActive ? 'text-emerald-400 animate-pulse' : 'text-stone-500'}`} />
                    <span className="font-semibold text-[11px]">
                      Auto-Sync Mode:{' '}
                      <span className={isSyncActive ? 'text-emerald-400' : 'text-stone-400'}>
                        {isSyncActive ? 'ACTIVE (Watching for updates)' : 'OFF'}
                      </span>
                    </span>
                  </div>

                  {isSyncActive ? (
                    <button
                      onClick={() => onToggleSync(false, '')}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg font-semibold cursor-pointer transition-colors"
                    >
                      Turn Off
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const clean = username.trim().toLowerCase();
                        if (clean) {
                          onToggleSync(true, clean);
                          if (latestRecentGame) {
                            handleLoadGame(latestRecentGame, false);
                          }
                          handleSearchUsername(clean);
                        }
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold cursor-pointer transition-colors shadow-md shadow-emerald-950/40"
                    >
                      Turn On Auto-Sync
                    </button>
                  )}
                </div>
              </div>

              {/* User Query Error */}
              {userError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{userError}</span>
                </div>
              )}

              {/* Highlight Card: Most Recent / Latest Game on Chess.com */}
              {latestRecentGame && (
                <div className="p-3.5 bg-gradient-to-br from-emerald-950/50 to-stone-900 border border-emerald-500/60 rounded-xl space-y-2.5 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Your Latest Game on Chess.com
                    </span>
                    {latestRecentGame.time_class && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-600/40 text-emerald-300 uppercase">
                        {latestRecentGame.time_class}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-extrabold text-white text-sm">
                        {latestRecentGame.white.username} ({latestRecentGame.white.rating || '?'}) vs{' '}
                        {latestRecentGame.black.username} ({latestRecentGame.black.rating || '?'})
                      </p>
                      <p className="text-[11px] text-stone-300">
                        Result: <span className="font-semibold text-emerald-400">{latestRecentGame.white.result}</span> vs{' '}
                        <span className="font-semibold text-rose-400">{latestRecentGame.black.result}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadGame(latestRecentGame)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md ${
                          selectedGameUrl === latestRecentGame.url
                            ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{selectedGameUrl === latestRecentGame.url ? 'On Board ✓' : 'Load to Board'}</span>
                      </button>

                      {latestRecentGame.url && extractGameId(latestRecentGame.url) && (
                        <button
                          onClick={() => {
                            const id = extractGameId(latestRecentGame.url!)!;
                            handleConnectLiveGame(id);
                            setActiveTab('live');
                          }}
                          className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/80 text-rose-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
                          <span>Watch Live</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Explanation when searched */}
              {hasSearchedUser && (
                <div className="p-3 bg-stone-950/50 border border-stone-800 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
                    <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>Connected to @{username}</span>
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    {dailyGames.length > 0 ? (
                      `Found ${dailyGames.length} active daily games!`
                    ) : (
                      <>
                        Live games (Rapid/Blitz) finish quickly and aren't stored as open daily correspondence. Your latest match is loaded above! While playing a live game, use the{' '}
                        <button
                          onClick={() => setActiveTab('live')}
                          className="text-emerald-400 underline font-semibold hover:text-emerald-300 cursor-pointer"
                        >
                          Live Game URL / ID
                        </button>{' '}
                        tab to auto-move your board in real time.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Active Daily Games List */}
              {dailyGames.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                    <span>Active Daily Games ({dailyGames.length})</span>
                    <span className="text-[10px] text-stone-400 font-normal">Click to sync live</span>
                  </h3>
                  <div className="space-y-2">
                    {dailyGames.map((game, idx) => {
                      const isSelected = selectedGameUrl === game.url;
                      return (
                        <div
                          key={game.url || idx}
                          onClick={() => handleLoadGame(game)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                              : 'bg-stone-950/60 border-stone-800 hover:border-stone-700 hover:bg-stone-800/40'
                          }`}
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {game.white.username} vs {game.black.username}
                              </span>
                              {game.time_class && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-stone-800 text-stone-300 uppercase">
                                  {game.time_class}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-400 font-mono truncate">
                              Turn: {game.turn ? game.turn.toUpperCase() : 'In Progress'} • FEN:{' '}
                              {game.fen?.slice(0, 24)}...
                            </p>
                          </div>

                          <button className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer">
                            Load
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Archive Games */}
              {recentGames.length > 1 && (
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Past Finished Games ({recentGames.length})
                  </h3>
                  <div className="space-y-1.5">
                    {recentGames.slice(1).map((game, idx) => {
                      const cleanUser = username.trim().toLowerCase();
                      const isWhite = game.white.username.toLowerCase() === cleanUser;
                      const won = isWhite ? game.white.result === 'win' : game.black.result === 'win';
                      const drawn =
                        game.white.result === 'draw' ||
                        game.white.result === 'stalemate' ||
                        game.white.result === 'repetition';

                      return (
                        <div
                          key={game.url || idx}
                          onClick={() => handleLoadGame(game)}
                          className="p-2.5 bg-stone-950/60 border border-stone-800 hover:border-emerald-500/50 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-colors"
                        >
                          <div className="overflow-hidden">
                            <div className="font-bold text-white flex items-center gap-2">
                              <span className="truncate">
                                {game.white.username} ({game.white.rating || '?'}) vs{' '}
                                {game.black.username} ({game.black.rating || '?'})
                              </span>
                              {game.time_class && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-stone-800 text-stone-300 uppercase shrink-0">
                                  {game.time_class}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                              <span
                                className={`font-semibold ${
                                  won ? 'text-emerald-400' : drawn ? 'text-stone-400' : 'text-rose-400'
                                }`}
                              >
                                {won ? 'Victory' : drawn ? 'Draw' : 'Loss'}
                              </span>
                              <span className="text-stone-500">•</span>
                              <span className="text-stone-400 text-[10px]">
                                {game.white.result} vs {game.black.result}
                              </span>
                            </div>
                          </div>

                          <button className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-emerald-600 hover:text-white text-stone-300 font-semibold text-xs transition-colors shrink-0 cursor-pointer">
                            Analyze
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Paste Moves / PGN */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="bg-stone-950/70 p-3 rounded-xl border border-stone-800 space-y-2">
                <label className="block text-[11px] font-semibold text-stone-200">
                  Paste PGN Moves or FEN String
                </label>
                <textarea
                  rows={4}
                  value={pastedInput}
                  onChange={(e) => setPastedInput(e.target.value)}
                  placeholder="e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 or rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"
                  className="w-full p-2.5 bg-stone-900 border border-stone-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500 placeholder:text-stone-500 resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-stone-400">
                    Supports full PGN with clocks or standard FEN
                  </span>
                  <button
                    onClick={handleManualImport}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs cursor-pointer transition-colors shadow-md"
                  >
                    Load Moves
                  </button>
                </div>
                {pasteFeedback && (
                  <p
                    className={`text-[11px] font-semibold ${
                      pasteFeedback.includes('successfully') ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {pasteFeedback}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-stone-950/70 border-t border-stone-800 flex items-center justify-between">
          <div className="text-[11px] text-stone-400 flex items-center gap-2">
            {activeLiveGameId ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Live Polling Active (Game #{activeLiveGameId})
              </span>
            ) : isSyncActive ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Auto-syncing @{activeUsername}
              </span>
            ) : (
              <span>Not syncing</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
