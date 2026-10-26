import { decodeTCN, tcnToPgn } from 'chess-tcn';
import { Chess } from 'chess.js';

export interface ChesscomGameInfo {
  url: string;
  id?: string;
  fen?: string;
  pgn?: string;
  white: {
    username: string;
    rating?: number;
    result?: string;
  };
  black: {
    username: string;
    rating?: number;
    result?: string;
  };
  time_control?: string;
  time_class?: string;
  turn?: 'white' | 'black';
  move_by?: number;
  isLive?: boolean;
  isFinished?: boolean;
}

export interface ParsedGameInput {
  platform: 'chesscom' | 'lichess' | 'chesscom-user' | 'chesscom-play' | 'pgn' | 'fen';
  id: string;
  gameType?: 'live' | 'daily';
  rawInput: string;
}

/**
 * Safely decodes TCN move list to PGN, respecting initialSetup / FEN positions without crashing
 */
export function safeTcnToPgn(
  moveList: string,
  initialSetup?: string,
  whitePlayer = 'White',
  blackPlayer = 'Black',
  eventName = 'Chess.com Game'
): { pgn: string; fen?: string; moveCount: number; lastMoveUci?: string } {
  const cleanFen = initialSetup?.trim();
  let chess: Chess;
  try {
    chess = cleanFen ? new Chess(cleanFen) : new Chess();
  } catch {
    chess = new Chess();
  }

  const moves = decodeTCN(moveList || '');
  let lastMoveUci: string | undefined;

  for (const mv of moves) {
    try {
      if (mv.from && mv.to) {
        const res = chess.move({
          from: mv.from,
          to: mv.to,
          promotion: mv.promotion,
        });
        if (res) {
          lastMoveUci = `${res.from}${res.to}${res.promotion || ''}`;
        }
      }
    } catch {
      // Break gracefully on any desynced move without throwing
      break;
    }
  }

  const headerLines = [
    `[Event "${eventName}"]`,
    `[Site "Chess.com"]`,
    `[White "${whitePlayer}"]`,
    `[Black "${blackPlayer}"]`,
    `[Result "*"]`,
  ];
  if (cleanFen && cleanFen !== 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    headerLines.push(`[SetUp "1"]`);
    headerLines.push(`[FEN "${cleanFen}"]`);
  }

  const cleanMoves = chess.pgn().replace(/\[.*?\]\n?/g, '').trim();
  const pgn = `${headerLines.join('\n')}\n\n${cleanMoves || '*'}`;

  return {
    pgn,
    fen: chess.fen(),
    moveCount: moves.length,
    lastMoveUci,
  };
}

/**
 * Parses user input to identify Chess.com, Lichess games, or Chess.com usernames.
 */
export function parseGameInput(input: string): ParsedGameInput | null {
  const clean = input.trim();
  if (!clean) return null;

  // Lichess URL e.g. lichess.org/3AZeeTfw or lichess.org/3AZeeTfw/black
  const lichessMatch = clean.match(/lichess\.org\/(?:[a-zA-Z0-9_\-]+\/)?([a-zA-Z0-9]{8,12})/i);
  if (lichessMatch && lichessMatch[1]) {
    const lichessId = lichessMatch[1].slice(0, 8);
    return {
      platform: 'lichess',
      id: lichessId,
      rawInput: clean,
    };
  }

  const isDaily = /daily/i.test(clean);
  const isLive = /live/i.test(clean);

  // Pure digits (e.g. 185196460786 or 1040912862)
  if (/^\d{6,15}$/.test(clean)) {
    return {
      platform: 'chesscom',
      id: clean,
      gameType: undefined,
      rawInput: clean,
    };
  }

  // Chess.com URLs with numeric game ID:
  // e.g. chess.com/game/live/185196460786, chess.com/game/daily/1040912862,
  // chess.com/analysis/game/live/185196460786, chess.com/live#g=185196460786
  const idMatch =
    clean.match(/(?:live|daily|game)\/(\d{6,15})/i) ||
    clean.match(/[#&?]g=(\d{6,15})/i) ||
    clean.match(/\/(\d{6,15})(?:\/|\?|#|$)/) ||
    clean.match(/(\d{6,15})/);

  if (idMatch && idMatch[1]) {
    return {
      platform: 'chesscom',
      id: idMatch[1],
      gameType: isDaily ? 'daily' : isLive ? 'live' : undefined,
      rawInput: clean,
    };
  }

  // Chess.com member URL, e.g. chess.com/member/pecanduLCbkp
  const memberMatch = clean.match(/chess\.com\/member\/([a-zA-Z0-9_\-]+)/i);
  if (memberMatch && memberMatch[1]) {
    return {
      platform: 'chesscom-user',
      id: memberMatch[1],
      rawInput: clean,
    };
  }

  // Generic play URL: chess.com/play/online or chess.com/live
  if (/chess\.com\/(?:play|live)/i.test(clean)) {
    return {
      platform: 'chesscom-play',
      id: 'online',
      rawInput: clean,
    };
  }

  // Direct PGN notation (e.g. 1. e4 e5 ... or [Event "..."])
  if (
    clean.startsWith('[') ||
    /\b1\.\s*[a-zA-Z]/.test(clean) ||
    /^(?:[O0]-[O0]|[a-h][1-8]|[NBRQK][a-h1-8]?x?[a-h][1-8])/.test(clean)
  ) {
    return {
      platform: 'pgn',
      id: 'pgn',
      rawInput: clean,
    };
  }

  // Direct FEN position string (e.g. rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1)
  if (clean.includes('/') && clean.split('/').length >= 7) {
    return {
      platform: 'fen',
      id: 'fen',
      rawInput: clean,
    };
  }

  // Username input: e.g. @pecanduLCbkp or pecanduLCbkp (alphanumeric 3-30 chars, no slashes/spaces)
  if (/^@?[a-zA-Z0-9_\-]{3,30}$/.test(clean) && !clean.includes('/') && !clean.includes('.')) {
    return {
      platform: 'chesscom-user',
      id: clean.replace(/^@/, ''),
      rawInput: clean,
    };
  }

  return null;
}

/**
 * Extracts numeric game ID from a chess.com URL or raw ID string.
 */
export function extractGameId(input: string): string | null {
  const parsed = parseGameInput(input);
  return parsed?.id || null;
}

/**
 * Fetches real-time live or daily game status from Chess.com callback via backend proxy
 */
export async function fetchLiveGameCallback(
  gameId: string,
  _preferredType?: 'live' | 'daily'
): Promise<{
  success: boolean;
  data?: any;
  pgn?: string;
  fen?: string;
  white?: string;
  black?: string;
  isFinished?: boolean;
  moveCount?: number;
  lastMoveUci?: string;
  status?: number;
  error?: string;
  isLiveInProgress?: boolean;
}> {
  try {
    const username = localStorage.getItem('chesscom_username');
    if (username) {
      const recents = await fetchRecentGames(username, 20).catch(() => []);
      const matched = recents.find((g) => g.url && g.url.includes(gameId));
      if (matched && (matched.pgn || matched.fen)) {
        return {
          success: true,
          pgn: matched.pgn,
          fen: matched.fen,
          white: matched.white.username,
          black: matched.black.username,
          isFinished: true,
          moveCount: matched.pgn ? Math.max(1, matched.pgn.split(/\d+\./).length - 1) : 0,
        };
      }
    }

    return {
      success: false,
      status: 404,
      error: `Game #${gameId} not found in archive. Please use the Paste PGN / FEN tab or search by username in the Chess.com Archive tab.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch game from archive.',
    };
  }
}

/**
 * Fetches game from Lichess public API
 */
export async function fetchLichessGame(gameId: string): Promise<{
  success: boolean;
  pgn?: string;
  white?: string;
  black?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`https://lichess.org/game/export/${encodeURIComponent(gameId)}?clocks=false&evals=false`, {
      headers: { Accept: 'application/x-chess-pgn, text/plain' },
    });
    if (!res.ok) {
      return {
        success: false,
        error: `Lichess game #${gameId} not found (Status ${res.status})`,
      };
    }
    const pgn = await res.text();
    if (!pgn || !pgn.trim()) {
      return { success: false, error: 'Empty PGN returned from Lichess' };
    }

    const whiteMatch = pgn.match(/\[White\s+"([^"]+)"\]/);
    const blackMatch = pgn.match(/\[Black\s+"([^"]+)"\]/);

    return {
      success: true,
      pgn,
      white: whiteMatch ? whiteMatch[1] : 'White',
      black: blackMatch ? blackMatch[1] : 'Black',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch Lichess game',
    };
  }
}

/**
 * Fetches ongoing Daily games from public API
 */
export async function fetchDailyGames(username: string): Promise<ChesscomGameInfo[]> {
  const cleanUser = username.trim().toLowerCase();
  const res = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games?t=${Date.now()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Player "${username}" does not exist on Chess.com.`);
    }
    throw new Error(`Chess.com API error (${res.status})`);
  }

  const data = await res.json();
  return (data.games || []).map((g: any) => ({
    url: g.url,
    fen: g.fen,
    pgn: g.pgn,
    white: {
      username: g.white?.username || g.white?.split('/').pop() || 'White',
      rating: g.white?.rating,
    },
    black: {
      username: g.black?.username || g.black?.split('/').pop() || 'Black',
      rating: g.black?.rating,
    },
    time_control: g.time_control,
    time_class: g.time_class,
    turn: g.turn,
    move_by: g.move_by,
    isLive: false,
    isFinished: false,
  }));
}

/**
 * Fetches latest finished games from user archives with cache-busting
 */
export async function fetchRecentGames(
  username: string,
  limit = 8
): Promise<ChesscomGameInfo[]> {
  const cleanUser = username.trim().toLowerCase();
  const archRes = await fetch(
    `https://api.chess.com/pub/player/${cleanUser}/games/archives?t=${Date.now()}`,
    { cache: 'no-store' }
  );

  if (!archRes.ok) {
    return [];
  }

  const archData = await archRes.json();
  const archives: string[] = archData.archives || [];
  if (archives.length === 0) return [];

  const latestArchiveUrl = archives[archives.length - 1];
  const separator = latestArchiveUrl.includes('?') ? '&' : '?';
  const monthRes = await fetch(`${latestArchiveUrl}${separator}t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!monthRes.ok) return [];

  const monthData = await monthRes.json();
  const games: any[] = monthData.games || [];
  if (games.length === 0) return [];

  return games
    .slice(-limit)
    .reverse()
    .map((g: any) => ({
      url: g.url,
      fen: g.fen,
      pgn: g.pgn,
      white: {
        username: g.white?.username || 'White',
        rating: g.white?.rating,
        result: g.white?.result,
      },
      black: {
        username: g.black?.username || 'Black',
        rating: g.black?.rating,
        result: g.black?.result,
      },
      time_control: g.time_control,
      time_class: g.time_class,
      isLive: false,
      isFinished: true,
    }));
}

/**
 * Fetches the user's most recent game (whether active or concluded)
 */
export async function fetchLatestUserGame(username: string): Promise<ChesscomGameInfo | null> {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;

  try {
    const daily = await fetchDailyGames(clean);
    if (daily && daily.length > 0) {
      return daily[0];
    }
  } catch {}

  try {
    const recents = await fetchRecentGames(clean, 3);
    if (recents && recents.length > 0) {
      return recents[0];
    }
  } catch {}

  return null;
}

export interface ChesscomUserStatus {
  success: boolean;
  onlineStatus?: string; // 'onlive' | 'online' | 'offline'
  isOnLive?: boolean;
  chessTitle?: string;
  avatarUrl?: string;
  bestRating?: number;
  bestRatingType?: string;
}

/**
 * Fetches real-time online status and live activity of a Chess.com player
 */
export async function fetchUserStatus(username: string): Promise<ChesscomUserStatus | null> {
  try {
    const cleanUser = username.trim().toLowerCase();
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUser)}`),
      fetch(`https://api.chess.com/pub/player/${encodeURIComponent(cleanUser)}/stats`),
    ]);
    if (!profileRes.ok) return null;
    const profile = await profileRes.json();
    const stats = statsRes.ok ? await statsRes.json().catch(() => ({})) : {};

    const rapid = stats?.chess_rapid?.last?.rating;
    const blitz = stats?.chess_blitz?.last?.rating;
    const bullet = stats?.chess_bullet?.last?.rating;
    const bestRating = rapid || blitz || bullet;
    const bestRatingType = rapid ? 'Rapid' : blitz ? 'Blitz' : bullet ? 'Bullet' : undefined;

    return {
      success: true,
      chessTitle: profile.title,
      avatarUrl: profile.avatar,
      bestRating,
      bestRatingType,
    };
  } catch {
    return null;
  }
}
