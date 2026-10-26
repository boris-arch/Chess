import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  User,
  Copy,
  Check,
  FolderOpen,
  FileText,
  Clock,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import {
  ChesscomGameInfo,
  extractGameId,
  parseGameInput,
  fetchRecentGames,
  fetchLiveGameCallback,
  fetchLichessGame,
  fetchUserStatus,
  ChesscomUserStatus,
} from '../utils/chesscom';

interface ChesscomSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadFen: (fen: string) => boolean;
  onLoadPgn: (pgn: string) => boolean;
  onSetOrientation: (orientation: 'white' | 'black') => void;
  onSetMatchPlayers?: (players: { white: string; black: string; whiteRating?: number; blackRating?: number } | null) => void;
  initialUsername?: string;
}

export const ChesscomSyncModal: React.FC<ChesscomSyncModalProps> = ({
  isOpen,
  onClose,
  onLoadFen,
  onLoadPgn,
  onSetOrientation,
  onSetMatchPlayers,
  initialUsername,
}) => {
  // Tabs: 'paste' | 'url' | 'user'
  const [activeTab, setActiveTab] = useState<'paste' | 'url' | 'user'>('paste');

  // Tab 1: Paste PGN / FEN
  const [pastedInput, setPastedInput] = useState('');
  const [pasteFeedback, setPasteFeedback] = useState<string | null>(null);

  // Tab 2: URL or Game ID
  const [gameUrlInput, setGameUrlInput] = useState<string>('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlSuccess, setUrlSuccess] = useState<string | null>(null);

  // Tab 3: Username Archives
  const [username, setUsername] = useState<string>(() => {
    return initialUsername || localStorage.getItem('chesscom_username') || '';
  });
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<ChesscomGameInfo[]>([]);
  const [userStatus, setUserStatus] = useState<ChesscomUserStatus | null>(null);
  const [hasSearchedUser, setHasSearchedUser] = useState(false);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  if (!isOpen) return null;

  // Handle Paste & Load
  const handleLoadPasted = () => {
    setPasteFeedback(null);
    const text = pastedInput.trim();
    if (!text) {
      setPasteFeedback('Please paste PGN notation or a FEN string.');
      return;
    }

    // Try FEN first if it looks like FEN notation
    if (text.includes('/') && text.split(' ').length >= 2) {
      const ok = onLoadFen(text);
      if (ok) {
        if (onSetMatchPlayers) onSetMatchPlayers(null);
        setPasteFeedback('FEN board position loaded successfully!');
        setTimeout(() => onClose(), 400);
        return;
      }
    }

    // Otherwise try PGN
    const ok = onLoadPgn(text);
    if (ok) {
      if (onSetMatchPlayers) onSetMatchPlayers(null);
      setPasteFeedback('PGN moves loaded successfully! Stockfish analyzing.');
      setTimeout(() => onClose(), 400);
      return;
    }

    setPasteFeedback('Could not parse chess data. Please check FEN or PGN format.');
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedInput(text);
        setPasteFeedback(null);
      }
    } catch {
      setPasteFeedback('Clipboard access denied. Please paste manually into the text box.');
    }
  };

  // Handle Load from URL or ID
  const handleLoadByUrl = async () => {
    setUrlError(null);
    setUrlSuccess(null);
    const input = gameUrlInput.trim();
    if (!input) {
      setUrlError('Please enter a Chess.com or Lichess game URL or Game ID.');
      return;
    }

    const parsed = parseGameInput(input);
    if (!parsed) {
      setUrlError('Unrecognized URL format. Please paste a direct game link or Game ID number.');
      return;
    }

    setIsUrlLoading(true);
    try {
      if (parsed.platform === 'lichess') {
        const res = await fetchLichessGame(parsed.id);
        if (!res.success || !res.pgn) {
          setUrlError(res.error || `Could not load game #${parsed.id} from Lichess.`);
          return;
        }
        const ok = onLoadPgn(res.pgn);
        if (ok) {
          if (res.white && res.black && onSetMatchPlayers) {
            onSetMatchPlayers({
              white: res.white,
              black: res.black,
            });
          }
          setUrlSuccess(`Lichess Game #${parsed.id} loaded onto board!`);
          setTimeout(() => onClose(), 500);
          return;
        }
        setUrlError('Could not replay PGN moves from Lichess.');
        return;
      }

      // Chess.com
      const res = await fetchLiveGameCallback(parsed.id, parsed.gameType);
      if (res.success && res.pgn) {
        const ok = onLoadPgn(res.pgn);
        if (ok) {
          if (res.white && res.black) {
            if (onSetMatchPlayers) {
              onSetMatchPlayers({
                white: res.white,
                black: res.black,
              });
            }
            const cleanUser = username.trim().toLowerCase();
            if (cleanUser && res.black.toLowerCase() === cleanUser) {
              onSetOrientation('black');
            } else if (cleanUser && res.white.toLowerCase() === cleanUser) {
              onSetOrientation('white');
            }
          }
          setUrlSuccess(`Chess.com Game #${parsed.id} loaded (${res.white || 'White'} vs ${res.black || 'Black'})!`);
          setTimeout(() => onClose(), 500);
          return;
        }
      }

      setUrlError(
        res.error ||
          `Game #${parsed.id} could not be loaded. If this game is currently in progress, Chess.com archives it once concluded.`
      );
    } catch (err: any) {
      setUrlError(err.message || 'Failed to fetch game.');
    } finally {
      setIsUrlLoading(false);
    }
  };

  // Handle Search Username Archives
  const handleSearchUsername = async (userToQuery: string) => {
    const clean = userToQuery.trim().toLowerCase();
    if (!clean) {
      setUserError('Please enter a Chess.com username');
      return;
    }

    setIsUserLoading(true);
    setUserError(null);

    try {
      localStorage.setItem('chesscom_username', clean);
      const [recents, status] = await Promise.all([
        fetchRecentGames(clean, 12),
        fetchUserStatus(clean),
      ]);

      setRecentGames(recents);
      setUserStatus(status);
      setHasSearchedUser(true);

      if (recents.length === 0) {
        setUserError(`No completed games found in archives for @${clean}.`);
      }
    } catch (err: any) {
      setUserError(err.message || 'Failed to fetch player archives from Chess.com.');
    } finally {
      setIsUserLoading(false);
    }
  };

  // Load selected game from archive list
  const handleLoadArchivedGame = (g: ChesscomGameInfo) => {
    setLoadedUrl(g.url);
    const cleanUser = username.trim().toLowerCase();
    const isWhite = g.white.username.toLowerCase() === cleanUser;
    onSetOrientation(isWhite ? 'white' : 'black');

    if (onSetMatchPlayers) {
      onSetMatchPlayers({
        white: g.white.username,
        black: g.black.username,
        whiteRating: g.white.rating,
        blackRating: g.black.rating,
      });
    }

    let loaded = false;
    if (g.pgn) {
      loaded = onLoadPgn(g.pgn);
    } else if (g.fen) {
      loaded = onLoadFen(g.fen);
    }

    if (loaded) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-stone-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">Import Chess Game</h2>
              <p className="text-[11px] text-stone-400">
                Load games or positions into Stockfish 16 analysis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste PGN / FEN</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'url'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Game URL or ID</span>
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
            <span>Chess.com Archive</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: Paste PGN / FEN */}
          {activeTab === 'paste' && (
            <div className="space-y-3.5">
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-stone-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Paste PGN Notation or FEN String
                  </label>
                  <button
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-700 flex items-center gap-1 cursor-pointer transition-colors text-[11px]"
                  >
                    <Copy className="w-3 h-3 text-emerald-400" />
                    <span>Paste From Clipboard</span>
                  </button>
                </div>

                <textarea
                  value={pastedInput}
                  onChange={(e) => {
                    setPastedInput(e.target.value);
                    setPasteFeedback(null);
                  }}
                  rows={6}
                  placeholder={`Paste PGN moves (e.g. 1. e4 e5 2. Nf3 Nc6...)\nor a FEN position (e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1)`}
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white font-mono text-xs placeholder:text-stone-500 focus:outline-none focus:border-emerald-500 resize-none"
                />

                {pasteFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                      pasteFeedback.includes('successfully')
                        ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/80 border border-rose-800 text-rose-300'
                    }`}
                  >
                    {pasteFeedback.includes('successfully') ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{pasteFeedback}</span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => {
                      setPastedInput('');
                      setPasteFeedback(null);
                    }}
                    disabled={!pastedInput}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg cursor-pointer transition-colors disabled:opacity-40"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleLoadPasted}
                    disabled={!pastedInput.trim()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Load onto Board</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: URL or Game ID */}
          {activeTab === 'url' && (
            <div className="space-y-3.5">
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-stone-200 block mb-1.5">
                    Chess.com or Lichess Game Link / ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={gameUrlInput}
                      onChange={(e) => {
                        setGameUrlInput(e.target.value);
                        setUrlError(null);
                        setUrlSuccess(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleLoadByUrl()}
                      placeholder="e.g. chess.com/game/live/185293081302 or lichess.org/4rXo9qWe"
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleLoadByUrl}
                      disabled={isUrlLoading || !gameUrlInput.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-950/40"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isUrlLoading ? 'animate-spin' : ''}`} />
                      <span>{isUrlLoading ? 'Loading...' : 'Load Game'}</span>
                    </button>
                  </div>
                </div>

                {urlError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl flex items-start gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{urlError}</span>
                  </div>
                )}

                {urlSuccess && (
                  <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{urlSuccess}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Player Archives */}
          {activeTab === 'user' && (
            <div className="space-y-3.5">
              <div className="bg-stone-950/70 p-3.5 rounded-xl border border-stone-800 space-y-3">
                <label className="text-[11px] font-semibold text-stone-200 block mb-1">
                  Search Chess.com Player Profile
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-stone-500 font-bold">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchUsername(username)}
                      placeholder="e.g. magnuscarlsen or your username"
                      className="w-full pl-7 pr-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-white text-xs placeholder:text-stone-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => handleSearchUsername(username)}
                    disabled={isUserLoading || !username.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 shadow-md shadow-emerald-950/40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isUserLoading ? 'animate-spin' : ''}`} />
                    <span>{isUserLoading ? 'Searching...' : 'Search Games'}</span>
                  </button>
                </div>

                {userError && (
                  <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl flex items-center gap-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{userError}</span>
                  </div>
                )}

                {userStatus && (
                  <div className="flex items-center gap-3 p-2.5 bg-stone-900/80 rounded-xl border border-stone-800">
                    {userStatus.avatarUrl ? (
                      <img
                        src={userStatus.avatarUrl}
                        alt={username}
                        className="w-8 h-8 rounded-full border border-stone-700 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                        {username.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">@{username}</span>
                        {userStatus.chessTitle && (
                          <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500 text-stone-950 font-black">
                            {userStatus.chessTitle}
                          </span>
                        )}
                      </div>
                      {userStatus.bestRating && (
                        <span className="text-[11px] text-stone-400">
                          {userStatus.bestRatingType || 'Rating'}: {userStatus.bestRating}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Archive Games List */}
              {recentGames.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block px-1">
                    Completed Matches ({recentGames.length})
                  </span>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                    {recentGames.map((g, idx) => {
                      const id = extractGameId(g.url);
                      return (
                        <div
                          key={g.url || idx}
                          className="p-3 bg-stone-950/80 border border-stone-800/90 hover:border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              {g.time_class && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-emerald-300 font-semibold capitalize">
                                  {g.time_class}
                                </span>
                              )}
                              <span className="text-white font-bold truncate">
                                {g.white.username} ({g.white.rating || '?'}) vs{' '}
                                {g.black.username} ({g.black.rating || '?'})
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-400 flex items-center gap-2">
                              <span>
                                Result: <strong className="text-emerald-400">{g.white.result}</strong> vs{' '}
                                <strong className="text-rose-400">{g.black.result}</strong>
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleLoadArchivedGame(g)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer transition-colors text-xs shrink-0 shadow-sm"
                          >
                            Load to Board
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
