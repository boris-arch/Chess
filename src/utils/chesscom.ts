import { tcnToPgn } from 'chess-tcn';

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

/**
 * Extracts numeric game ID from a chess.com URL or raw ID string.
 */
export function extractGameId(input: string): string | null {
  const clean = input.trim();
  if (!clean) return null;

  // Pure digits
  if (/^\d{6,15}$/.test(clean)) {
    return clean;
  }

  // URLs like chess.com/game/live/185196460786 or chess.com/game/daily/1040912862
  const match = clean.match(/(?:live|daily|game)\/(\d{6,15})/i) || clean.match(/\/(\d{6,15})(?:\/|\?|#|$)/);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Fetches real-time live game status from Chess.com callback via backend proxy
 */
export async function fetchLiveGameCallback(gameId: string): Promise<{
  success: boolean;
  data?: any;
  pgn?: string;
  white?: string;
  black?: string;
  isFinished?: boolean;
  moveCount?: number;
  lastMoveUci?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/chesscom/live/${gameId}`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errJson.error || `Chess.com game not found (Status ${res.status})`,
      };
    }

    const payload = await res.json();
    const game = payload.game;
    if (!game) {
      return { success: false, error: 'Invalid game data received from Chess.com' };
    }

    const players = payload.players || {};
    const whitePlayer =
      game.pgnHeaders?.White || players.bottom?.username || players.white?.username || 'White';
    const blackPlayer =
      game.pgnHeaders?.Black || players.top?.username || players.black?.username || 'Black';

    // Decode TCN moveList
    const moveList = game.moveList || '';
    let generatedPgn = '';
    let moveCount = 0;

    if (moveList.length > 0) {
      const rawPgn = tcnToPgn(moveList);
      // Strip generic headers from tcnToPgn and insert real metadata
      const cleanMoves = rawPgn.replace(/\[.*?\]\n?/g, '').trim();
      generatedPgn = `[Event "Chess.com Live Game"]\n[Site "Chess.com"]\n[White "${whitePlayer}"]\n[Black "${blackPlayer}"]\n[Result "*"]\n\n${cleanMoves}`;
      moveCount = moveList.length / 2;
    } else {
      generatedPgn = `[Event "Chess.com Live Game"]\n[Site "Chess.com"]\n[White "${whitePlayer}"]\n[Black "${blackPlayer}"]\n[Result "*"]\n\n*`;
    }

    return {
      success: true,
      data: payload,
      pgn: generatedPgn,
      white: whitePlayer,
      black: blackPlayer,
      isFinished: !!game.isFinished,
      moveCount,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch live game callback',
    };
  }
}

/**
 * Fetches ongoing Daily games from public API
 */
export async function fetchDailyGames(username: string): Promise<ChesscomGameInfo[]> {
  const cleanUser = username.trim().toLowerCase();
  const res = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games`, {
    headers: { Accept: 'application/json' },
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
 * Fetches latest finished games from user archives
 */
export async function fetchRecentGames(
  username: string,
  limit = 8
): Promise<ChesscomGameInfo[]> {
  const cleanUser = username.trim().toLowerCase();
  const archRes = await fetch(`https://api.chess.com/pub/player/${cleanUser}/games/archives`);

  if (!archRes.ok) {
    return [];
  }

  const archData = await archRes.json();
  const archives: string[] = archData.archives || [];
  if (archives.length === 0) return [];

  const latestArchiveUrl = archives[archives.length - 1];
  const monthRes = await fetch(latestArchiveUrl);
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
