import { Chess, Square as ChessSquare, Move } from 'chess.js';

// Piece values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece Square Tables (From White's perspective, 8x8 flattened a8=0 ... h1=63)
// 0 is a8, 7 is h8, 56 is a1, 63 is h1
const PAWN_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 27, 27, 10,  5,  5,
   0,  0,  0, 25, 25,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-25,-25, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDDLE_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

function squareToIndex(sq: string): number {
  const file = sq.charCodeAt(0) - 97; // a=0, h=7
  const rank = 8 - parseInt(sq[1], 10); // 8=0, 1=7
  return rank * 8 + file;
}

function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    // If the side whose turn it is is checkmated:
    return game.turn() === 'w' ? -20000 : 20000;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition() || game.isInsufficientMaterial()) {
    return 0;
  }

  let whiteScore = 0;
  let blackScore = 0;

  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;

      const val = PIECE_VALUES[piece.type] || 0;
      const whiteIdx = r * 8 + f;
      const blackIdx = (7 - r) * 8 + f;

      let posBonus = 0;
      if (piece.type === 'p') {
        posBonus = piece.color === 'w' ? PAWN_PST[whiteIdx] : PAWN_PST[blackIdx];
      } else if (piece.type === 'n') {
        posBonus = piece.color === 'w' ? KNIGHT_PST[whiteIdx] : KNIGHT_PST[blackIdx];
      } else if (piece.type === 'b') {
        posBonus = piece.color === 'w' ? BISHOP_PST[whiteIdx] : BISHOP_PST[blackIdx];
      } else if (piece.type === 'r') {
        posBonus = piece.color === 'w' ? ROOK_PST[whiteIdx] : ROOK_PST[blackIdx];
      } else if (piece.type === 'q') {
        posBonus = piece.color === 'w' ? QUEEN_PST[whiteIdx] : QUEEN_PST[blackIdx];
      } else if (piece.type === 'k') {
        posBonus = piece.color === 'w' ? KING_MIDDLE_PST[whiteIdx] : KING_MIDDLE_PST[blackIdx];
      }

      const totalPieceVal = val + posBonus;
      if (piece.color === 'w') {
        whiteScore += totalPieceVal;
      } else {
        blackScore += totalPieceVal;
      }
    }
  }

  // Slight mobility score
  const mobility = game.moves().length * 3;
  if (game.turn() === 'w') {
    whiteScore += mobility;
  } else {
    blackScore += mobility;
  }

  return whiteScore - blackScore;
}

export interface EngineResult {
  multipv: number;
  depth: number;
  scoreCp: number | null;
  mate: number | null;
  nodes: number;
  nps: number;
  pv: string[];
  pvSan: string[];
  bestMoveUci: string;
  bestMoveSan: string;
}

/**
 * Calculates top candidate moves using minimax with alpha-beta pruning and quiescence search
 */
export function calculateBestMoves(
  fen: string,
  targetDepth: number = 3,
  multiPvCount: number = 3,
  onProgress?: (lines: EngineResult[], currentDepth: number, nodes: number) => void
): EngineResult[] {
  const game = new Chess(fen);
  const legalMoves = game.moves({ verbose: true });

  if (legalMoves.length === 0) {
    return [];
  }

  const isWhite = game.turn() === 'w';
  let nodesCount = 0;
  const startTime = Date.now();

  // Quiescence search to resolve captures
  function quiescence(g: Chess, alpha: number, beta: number, qDepth: number): number {
    nodesCount++;
    const standPat = (isWhite ? 1 : -1) * evaluatePosition(g);
    if (qDepth <= 0) return standPat;

    if (standPat >= beta) return beta;
    let localAlpha = Math.max(alpha, standPat);

    const captureMoves = g.moves({ verbose: true }).filter(m => m.captured);
    for (const m of captureMoves) {
      g.move(m);
      const score = -quiescence(g, -beta, -localAlpha, qDepth - 1);
      g.undo();

      if (score >= beta) return beta;
      if (score > localAlpha) localAlpha = score;
    }
    return localAlpha;
  }

  // Alpha-beta negamax
  function alphaBeta(
    g: Chess,
    depth: number,
    alpha: number,
    beta: number,
    turnMultiplier: number
  ): { score: number; line: Move[] } {
    nodesCount++;

    if (depth === 0 || g.isGameOver()) {
      if (g.isGameOver()) {
        const evalScore = evaluatePosition(g) * turnMultiplier;
        return { score: evalScore, line: [] };
      }
      const qScore = quiescence(g, alpha, beta, 2) * turnMultiplier;
      return { score: qScore, line: [] };
    }

    const moves = g.moves({ verbose: true });
    // Move ordering: prioritize captures
    moves.sort((a, b) => {
      const aVal = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
      const bVal = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
      return bVal - aVal;
    });

    let bestScore = -Infinity;
    let bestLine: Move[] = [];

    for (const m of moves) {
      g.move(m);
      const res = alphaBeta(g, depth - 1, -beta, -alpha, -turnMultiplier);
      const score = -res.score;
      g.undo();

      if (score > bestScore) {
        bestScore = score;
        bestLine = [m, ...res.line];
      }

      if (score > alpha) {
        alpha = score;
      }
      if (alpha >= beta) {
        break;
      }
    }

    return { score: bestScore, line: bestLine };
  }

  // Root evaluation with Multi-PV
  const scoredMoves: {
    move: Move;
    score: number;
    continuation: Move[];
  }[] = [];

  // Order moves initially
  const initialMoves = [...legalMoves].sort((a, b) => {
    const aVal = a.captured ? (PIECE_VALUES[a.captured] || 0) : 0;
    const bVal = b.captured ? (PIECE_VALUES[b.captured] || 0) : 0;
    return bVal - aVal;
  });

  // Iterative deepening from depth 1 up to targetDepth
  let latestResults: EngineResult[] = [];

  for (let currentDepth = 1; currentDepth <= targetDepth; currentDepth++) {
    scoredMoves.length = 0;

    for (const m of initialMoves) {
      game.move(m);
      const multiplier = isWhite ? -1 : 1;
      const res = alphaBeta(game, currentDepth - 1, -Infinity, Infinity, multiplier);
      // Res score is from opponent perspective when negamaxed, so flip it
      const moveScore = isWhite ? -res.score : res.score;
      game.undo();

      scoredMoves.push({
        move: m,
        score: moveScore,
        continuation: [m, ...res.line],
      });
    }

    // Sort by best score: highest score if white to move, lowest if black
    scoredMoves.sort((a, b) => {
      return isWhite ? b.score - a.score : a.score - b.score;
    });

    const elapsedSec = Math.max(0.01, (Date.now() - startTime) / 1000);
    const nps = Math.round(nodesCount / elapsedSec);

    const linesToTake = Math.min(multiPvCount, scoredMoves.length);
    latestResults = scoredMoves.slice(0, linesToTake).map((item, idx) => {
      const uci = `${item.move.from}${item.move.to}${item.move.promotion || ''}`;
      const pvUci = item.continuation.map(c => `${c.from}${c.to}${c.promotion || ''}`);
      const pvSan = item.continuation.map(c => c.san);

      let mateVal: number | null = null;
      let cpVal: number | null = item.score;

      if (Math.abs(item.score) >= 19000) {
        const movesToMate = Math.max(1, Math.round((20000 - Math.abs(item.score)) / 100));
        mateVal = item.score > 0 ? movesToMate : -movesToMate;
        cpVal = null;
      }

      return {
        multipv: idx + 1,
        depth: currentDepth,
        scoreCp: cpVal,
        mate: mateVal,
        nodes: nodesCount,
        nps,
        pv: pvUci,
        pvSan,
        bestMoveUci: uci,
        bestMoveSan: item.move.san,
      };
    });

    if (onProgress) {
      onProgress(latestResults, currentDepth, nodesCount);
    }
  }

  return latestResults;
}
